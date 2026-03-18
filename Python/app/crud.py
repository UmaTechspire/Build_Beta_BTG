from sqlalchemy import text
import re
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Union, Optional
from . import schemas
from .models.finance import ARReceipt
from sqlalchemy import select, desc, update
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# --- UPDATED DEFAULTS TO LIVE DATABASES ---
DB_NAME_FINANCE = os.getenv('DB_NAME_FINANCE', 'btggasify_finance_live')
DB_NAME_USER = os.getenv('DB_NAME_USER', 'btggasify_live')
DB_NAME_USER_NEW = os.getenv('DB_NAME_USER_NEW', 'btggasify_userpanel_live')
DB_NAME_MASTER = os.getenv('DB_NAME_MASTER', 'btggasify_masterpanel_live')

# ----------------------------------------------------------
# 1. CREATE AR RECEIPT
# ----------------------------------------------------------
async def create_ar_receipt(db: AsyncSession, command: schemas.CreateARCommand):
    created_records = []
    
    for item in command.header:
        is_cleared_status = False
        if item.deposit_bank_id and str(item.deposit_bank_id) != "0" and str(item.deposit_bank_id).strip() != "":
            is_cleared_status = True

        # --- WORKFLOW LOGIC ---
        is_posted = item.is_posted
        pending_verification = True if is_posted else False

        db_receipt = ARReceipt(
            orgid=command.orgId,
            branchid=command.branchId,
            created_by=str(command.userId),
            created_ip=command.userIp,
            
            # 🟢 FIX: Use the User-Selected Date (Transaction Date), NOT Today's Date
            receipt_date=item.receipt_date, 
            
            customer_id=item.customer_id,
            bank_amount=item.bank_amount,
            bank_charges=item.bank_charges,
            deposit_bank_id=str(item.deposit_bank_id),
            
            # New Fields
            reference_no=item.reference_no,
            sales_person_id=item.sales_person_id,
            send_notification=item.send_notification,

            # 🟢 Persist Cash/Cheque/Via
            cash_amount=item.cash_amount,
            bank_payment_via=item.bank_payment_via,
            cheque_number=item.cheque_number,
            
            # --- STATUS FLAGS ---
            is_posted=is_posted,
            pending_verification=pending_verification, 
            is_submitted=False,
            
            # ... other fields ...
            flag=is_cleared_status, 
            is_cleared=is_cleared_status,
            is_active=True,
            
        )
        db.add(db_receipt)
        created_records.append(db_receipt)

    await db.commit()
    for record in created_records:
        await db.refresh(record)
    return created_records

# ----------------------------------------------------------
# 2. GET PENDING LIST
# ----------------------------------------------------------
async def get_pending_bank_books(db: AsyncSession):
    stmt = (
        select(ARReceipt)
        .where(ARReceipt.pending_verification == True)
        .order_by(desc(ARReceipt.receipt_id))
    )
    result = await db.execute(stmt)
    return result.scalars().all()


# ----------------------------------------------------------
# 3. GET RECEIPT BY ID
# ----------------------------------------------------------
async def get_receipt_by_id(db: AsyncSession, receipt_id: int):
    stmt = select(ARReceipt).where(ARReceipt.receipt_id == receipt_id)
    result = await db.execute(stmt)
    return result.scalars().first()


# ----------------------------------------------------------
# 4. UPDATE CUSTOMER + VERIFY
# ----------------------------------------------------------
async def update_customer_and_verify(
    db: AsyncSession, 
    receipt_id: int, 
    data: schemas.VerifyCustomerUpdate
):
    # 1. Fetch the Receipt
    stmt = select(ARReceipt).where(
        ARReceipt.receipt_id == receipt_id,
        ARReceipt.pending_verification == True
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        return None 

    # 2. Update Receipt Details
    if data.customer_id and data.customer_id != 0:
        record.customer_id = data.customer_id
    
    record.bank_charges = data.bank_charges
    record.tax_rate = data.tax_deduction 
    record.exchange_rate = data.exchange_rate
    # 3. PROCESS ALLOCATIONS (Idempotent)
    linked_invoices = await _process_receipt_allocations(db, record, data)

    # 4. Update Reference with Linked Invoices
    await _update_receipt_reference(record, data.reply_message, linked_invoices)

    record.pending_verification = False
    record.modified_on = datetime.now()

    await db.commit()
    await db.refresh(record)

    return record


# ----------------------------------------------------------
# 5. GET VERIFIED UNSUBMITTED
# ----------------------------------------------------------
async def get_verified_unsubmitted_books(db: AsyncSession):
    stmt = (
        select(ARReceipt)
        .where(
            ARReceipt.pending_verification == False,
            ARReceipt.is_submitted == False
        )
        .order_by(desc(ARReceipt.receipt_id))
    )
    result = await db.execute(stmt)
    return result.scalars().all()


# ----------------------------------------------------------
# 6. SUBMIT RECEIPT
# ----------------------------------------------------------
async def submit_receipt(db: AsyncSession, receipt_id: int):
    stmt = (
        update(ARReceipt)
        .where(ARReceipt.receipt_id == receipt_id)
        .values(is_submitted=True, pending_verification=True)
        .execution_options(synchronize_session="fetch")
    )
    
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount > 0


# ----------------------------------------------------------
# 6. Post to AR (UPSERT & AGGREGATE LOGIC)
# ----------------------------------------------------------
async def post_invoice_to_ar(db: AsyncSession, request: schemas.PostInvoiceToARRequest):
    try:
        # 1. Get the Invoice Number for the requested ID
        get_nbr_sql = text(f"SELECT salesinvoicenbr FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_header WHERE id = :inv_id")
        nbr_res = await db.execute(get_nbr_sql, {"inv_id": str(request.invoiceId)})
        invoice_number = nbr_res.scalar()

        if not invoice_number:
            return False

        # 2. Calculate the GRAND TOTAL for this Invoice Number (Aggregation)
        # We sum up ALL active headers that share this Invoice Number (e.g. 8008 + 8009 + ... + 8014)
        sum_sql = text(f"""
            SELECT 
                SUM(TotalAmount) as GrandTotal, 
                SUM(CalculatedPrice) as GrandTotalIDR,
                MIN(id) as PrimaryID -- Keep the first ID as the main link
            FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_header
            WHERE salesinvoicenbr = :nbr AND isactive = 1
        """)
        sum_res = await db.execute(sum_sql, {"nbr": invoice_number})
        totals = sum_res.fetchone()
        
        grand_total = totals.GrandTotal or 0
        grand_total_idr = totals.GrandTotalIDR or 0
        primary_id = totals.PrimaryID or request.invoiceId

        # 3. Check if AR entry already exists for this Invoice NUMBER
        check_sql = text(f"SELECT ar_id, already_received FROM {DB_NAME_FINANCE}.tbl_accounts_receivable WHERE invoice_no = :nbr")
        result = await db.execute(check_sql, {"nbr": invoice_number})
        existing_row = result.fetchone()

        if existing_row:
            # --- UPDATE SCENARIO (Upsert / Aggregation Fix) ---
            print(f"Aggregating AR record for Invoice No: {invoice_number}. New Total: {grand_total}")
            
            update_ar_sql = text(f"""
                UPDATE {DB_NAME_FINANCE}.tbl_accounts_receivable
                SET 
                    inv_amount = :total,
                    invoice_amt_idr = :total_idr,
                    balance_amount = (:total - already_received),
                    updated_by = :userId,
                    updated_date = NOW()
                WHERE invoice_no = :nbr
            """)
            
            await db.execute(update_ar_sql, {
                "total": grand_total,
                "total_idr": grand_total_idr,
                "userId": request.userId,
                "nbr": invoice_number
            })

        else:
            # --- INSERT SCENARIO ---
            print(f"Inserting new AR record for Invoice No: {invoice_number}")
            
            insert_sql = text(f"""
                INSERT INTO {DB_NAME_FINANCE}.tbl_accounts_receivable (
                    orgid, branchid, 
                    ar_no, 
                    invoice_no, invoice_id, invoice_date, 
                    customer_id, customer_name, 
                    inv_amount, balance_amount, already_received, 
                    invoice_amt_idr, currencyid, 
                    created_by, created_ip, created_date, 
                    is_active, is_partial
                )
                SELECT 
                    :orgId, :branchId,
                    CONCAT('AR-', h.salesinvoicenbr), 
                    h.salesinvoicenbr, 
                    :primary_id,  -- Use the Min ID to keep the link stable
                    h.Salesinvoicesdate,
                    h.customerid, 
                    IFNULL(c.CustomerName, 'Unknown'), 
                    :total,  -- Use Calculated Grand Total
                    :total, 
                    0, 
                    :total_idr, 
                    
                    (SELECT COALESCE(d.Currencyid, 1) 
                     FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_details d 
                     WHERE d.salesinvoicesheaderid = h.id 
                     LIMIT 1), 
                      
                    :userId, '127.0.0.1', NOW(), 
                    1, 0
                FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_header h
                LEFT JOIN {DB_NAME_USER}.master_customer c ON h.customerid = c.Id
                WHERE h.id = :inv_id
            """)
            
            await db.execute(insert_sql, {
                "orgId": request.orgId, 
                "branchId": request.branchId, 
                "userId": request.userId, 
                "inv_id": str(request.invoiceId),
                "primary_id": str(primary_id),
                "total": grand_total,
                "total_idr": grand_total_idr
            })

        # ---------------------------------------------------------
        # 4. Deactivate relevant DOs from AR Book
        # ---------------------------------------------------------
        deactivate_dos_sql = text(f"""
            UPDATE {DB_NAME_FINANCE}.tbl_accounts_receivable
            SET is_active = 0
            WHERE is_active = 1
              AND invoice_no != :inv_no
              AND invoice_no IN (
                  SELECT DISTINCT DOnumber 
                  FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_details 
                  WHERE salesinvoicesheaderid = :inv_id 
                    AND DOnumber IS NOT NULL 
                    AND DOnumber != ''
              )
        """)
        await db.execute(deactivate_dos_sql, {"inv_id": str(request.invoiceId), "inv_no": invoice_number})

        # ---------------------------------------------------------
        # 5. UPDATE HEADER FLAG (For the specific ID posted)
        # ---------------------------------------------------------
        update_header_flag_sql = text(f"""
            UPDATE {DB_NAME_USER_NEW}.tbl_salesinvoices_header 
            SET IsAR = 1 
            WHERE id = :inv_id
        """)
        
        await db.execute(update_header_flag_sql, {"inv_id": str(request.invoiceId)})

        await db.commit()
        return True

    except Exception as e:
        print(f"CRITICAL ERROR in post_invoice_to_ar: {str(e)}")
        await db.rollback()
        return False

# ----------------------------------------------------------
# 7. UPDATE AR RECEIPT
# ----------------------------------------------------------
async def update_ar_receipt(db: AsyncSession, command: schemas.CreateARCommand):
    updated_count = 0
    
    for item in command.header:
        is_cleared_status = False
        if item.deposit_bank_id and str(item.deposit_bank_id) != "0" and str(item.deposit_bank_id).strip() != "":
            is_cleared_status = True

        is_posted = item.is_posted
        pending_verification = True if is_posted else False

        values_to_update = {
            "customer_id": item.customer_id,
            "bank_amount": item.bank_amount,
            "cash_amount": item.cash_amount,
            "contra_amount": item.contra_amount,
            "bank_charges": item.bank_charges,
            "tax_rate": item.tax_rate,
            "deposit_bank_id": str(item.deposit_bank_id),
            "deposit_account_number": item.deposit_account_number,
            "cheque_number": item.cheque_number,
            "giro_number": item.giro_number,
            "bank_payment_via": item.bank_payment_via,
            "reference_no": item.reference_no,
            "sales_person_id": item.sales_person_id,
            "send_notification": item.send_notification,
            "is_posted": is_posted,
            "pending_verification": pending_verification,
            "flag": is_cleared_status,
            "is_cleared": is_cleared_status,
            "proof_missing": item.proof_missing,
            "contra_reference": item.contra_reference,
            # 🟢 FIX: Update receipt_date on Edit too
            "receipt_date": item.receipt_date
        }

        stmt = (
            update(ARReceipt)
            .where(ARReceipt.receipt_id == item.receipt_id)
            .values(**values_to_update)
            .execution_options(synchronize_session="fetch")
        )
        result = await db.execute(stmt)
        updated_count += result.rowcount

    await db.commit()
    return updated_count > 0

# ----------------------------------------------------------
# 🟢 8. GET AR BOOK (FIXED: UNION OF INVOICES AND RECEIPTS)
# ----------------------------------------------------------
async def get_ar_book(db: AsyncSession, customer_id: int, from_date: str = None, to_date: str = None):
    # 🟢 FIX: Fetch BOTH Invoices (from AR Table) and Receipts (from Receipt Table)
    # This solves "Missing Receipts" and "Currency Bug"
    
    sql = text(f"""
        -- 1. INVOICES
        SELECT 
            'Invoice' as doc_type,
            ar.ar_id as id,
            DATE_FORMAT(ar.invoice_date, '%Y-%m-%d') as ledger_date,
            ar.invoice_no,
            ar.invoice_no as reference_no, -- For display
            ar.inv_amount as invoice_amount,
            0 as receipt_amount,
            0 as debit_note_amount, 
            0 as credit_note_amount,
            ar.currencyid,
            mc.CurrencyCode,
            ar.created_date,
            NULL as deposit_bank_id,
            NULL as bank_name,
            ar.customer_name
        FROM {DB_NAME_FINANCE}.tbl_accounts_receivable ar
        LEFT JOIN {DB_NAME_USER}.master_currency mc ON ar.currencyid = mc.CurrencyId
        WHERE ar.customer_id = :cid AND ar.is_active = 1

        UNION ALL

        -- 2. RECEIPTS
        SELECT 
            'Receipt' as doc_type,
            r.receipt_id as id,
            DATE_FORMAT(r.receipt_date, '%Y-%m-%d') as ledger_date,
            r.reference_no as invoice_no, -- Map Reference to invoice_no for grouping in frontend
            r.receipt_no as reference_no, -- Display Receipt No (e.g. REC-1001)
            0 as invoice_amount,
            r.bank_amount as receipt_amount,
            0 as debit_note_amount,
            0 as credit_note_amount,
            r.currencyid,
            mc.CurrencyCode,
            r.created_date,
            r.deposit_bank_id,
            b.BankName as bank_name,
            c.CustomerName as customer_name
        FROM {DB_NAME_FINANCE}.tbl_ar_receipt r
        LEFT JOIN {DB_NAME_USER}.master_currency mc ON r.currencyid = mc.CurrencyId
        LEFT JOIN {DB_NAME_MASTER}.master_bank b ON CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = b.BankId
        LEFT JOIN {DB_NAME_USER}.master_customer c ON r.customer_id = c.Id
        WHERE r.customer_id = :cid AND r.is_active = 1 AND r.is_posted = 1

        ORDER BY ledger_date DESC, created_date DESC
    """)
    
    result = await db.execute(sql, {"cid": customer_id})
    return result.mappings().all()

# ----------------------------------------------------------
# SAVE DRAFT
# ----------------------------------------------------------
async def save_verification_draft(db: AsyncSession, receipt_id: int, data: schemas.SaveDraftRequest):
    stmt = select(ARReceipt).where(ARReceipt.receipt_id == receipt_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        return None 

    if data.customer_id:
        record.customer_id = data.customer_id
    
    record.bank_charges = data.bank_charges
    record.tax_rate = data.tax_deduction
    record.exchange_rate = data.exchange_rate

    # 3. PROCESS ALLOCATIONS (NEW for Save Draft)
    linked_invoices = await _process_receipt_allocations(db, record, data)

    # 4. Update Reference with Linked Invoices
    await _update_receipt_reference(record, data.reply_message, linked_invoices)
    
    record.modified_on = datetime.now()
    
    await db.commit()
    await db.refresh(record)
    return record


async def _process_receipt_allocations(db: AsyncSession, record: ARReceipt, data: Union[schemas.VerifyCustomerUpdate, schemas.SaveDraftRequest]):
    """Helper to clear old allocations and apply new ones idempotently."""
    receipt_id = record.receipt_id
    
    # A. PRE-CLEANUP: Revert existing allocations for this receipt_id
    old_allocs_query = text(f"""
        SELECT ar.invoice_id, ra.ar_id, ra.payment_amount 
        FROM {DB_NAME_FINANCE}.tbl_receipt_ag_ar ra
        JOIN {DB_NAME_FINANCE}.tbl_accounts_receivable ar ON ra.ar_id = ar.ar_id
        WHERE ra.receipt_id = :rid AND ra.is_active = 1
    """)
    old_res = await db.execute(old_allocs_query, {"rid": receipt_id})
    old_allocs = old_res.fetchall()

    for old in old_allocs:
        # Revert PaidAmount in Header
        await db.execute(text(f"UPDATE {DB_NAME_USER_NEW}.tbl_salesinvoices_header SET PaidAmount = PaidAmount - :amt WHERE id = :id"), {"amt": old.payment_amount, "id": old.invoice_id})
        # Revert already_received in AR
        await db.execute(text(f"UPDATE {DB_NAME_FINANCE}.tbl_accounts_receivable SET already_received = already_received - :amt, balance_amount = balance_amount + :amt WHERE ar_id = :arid"), {"amt": old.payment_amount, "arid": old.ar_id})

    # 2. Deactivate old allocation records
    await db.execute(text(f"UPDATE {DB_NAME_FINANCE}.tbl_receipt_ag_ar SET is_active = 0 WHERE receipt_id = :rid"), {"rid": receipt_id})

    # B. APPLY NEW ALLOCATIONS
    linked_invoices = []
    # Safeguard for user_id
    user_id = getattr(data, 'user_id', None) or (record.created_by or 'System')
    user_ip = record.created_ip or '127.0.0.1'

    for alloc in data.allocations:
        if alloc.amount_allocated > 0:
            # 1. Update PaidAmount in Header
            update_header = text(f"UPDATE {DB_NAME_USER_NEW}.tbl_salesinvoices_header SET PaidAmount = IFNULL(PaidAmount, 0) + :amt WHERE id = :id")
            await db.execute(update_header, {"amt": alloc.amount_allocated, "id": alloc.invoice_id})
            
            # 2. Get Invoice Number
            get_inv_nbr = text(f"SELECT salesinvoicenbr FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_header WHERE id = :id")
            inv_res = await db.execute(get_inv_nbr, {"id": alloc.invoice_id})
            inv_nbr = inv_res.scalar()
            if inv_nbr: linked_invoices.append(inv_nbr)

            # 3. Update AR Table
            get_ar = text(f"SELECT ar_id FROM {DB_NAME_FINANCE}.tbl_accounts_receivable WHERE invoice_id = :id LIMIT 1")
            ar_id = (await db.execute(get_ar, {"id": alloc.invoice_id})).scalar()
            
            if ar_id:
                # Insert Link
                insert_link = text(f"""
                    INSERT INTO {DB_NAME_FINANCE}.tbl_receipt_ag_ar 
                    (receipt_id, ar_id, payment_amount, receipt_date, created_date, created_by, created_ip, is_active)
                    VALUES (:rid, :arid, :amt, :rdate, NOW(), :uid, :ip, 1)
                """)
                await db.execute(insert_link, {
                    "rid": receipt_id, "arid": ar_id, "amt": alloc.amount_allocated,
                    "rdate": record.receipt_date or datetime.now().date(), "uid": user_id, "ip": user_ip
                })
                
                # Update AR Balance
                update_ar = text(f"UPDATE {DB_NAME_FINANCE}.tbl_accounts_receivable SET already_received = already_received + :amt, balance_amount = balance_amount - :amt, updated_date = NOW(), updated_by = :uid WHERE ar_id = :arid")
                await db.execute(update_ar, {"amt": alloc.amount_allocated, "uid": user_id, "arid": ar_id})
                
                if record.ar_id is None: record.ar_id = ar_id

    return linked_invoices


async def _update_receipt_reference(record: ARReceipt, reply_message: Optional[str], linked_invoices: List[str]):
    """Helper to construct the reference string with linked invoices."""
    current_desc = record.reference_no or ""
    # Clean up standard formats
    current_desc = re.sub(r'\s*\|\s*Inv:.*', '', current_desc, flags=re.IGNORECASE)
    current_desc = re.sub(r'\s*\|\s*Reply:.*', '', current_desc, flags=re.IGNORECASE)
    current_desc = re.sub(r'\s*\(Inv:.*?\)', '', current_desc, flags=re.IGNORECASE)
    current_desc = re.sub(r'\s*\(Reply:.*?\)', '', current_desc, flags=re.IGNORECASE)
    current_desc = current_desc.strip()
    
    additional_info = []
    if reply_message: additional_info.append(f"(Reply: {reply_message})")
    if linked_invoices: additional_info.append(f"(Inv: {', '.join(linked_invoices)})")
        
    if additional_info:
        record.reference_no = f"{current_desc} {' '.join(additional_info)}".strip()

# ----------------------------------------------------------
# UPDATE REFERENCE NUMBER (For AR Book Editing)
# ----------------------------------------------------------
async def update_invoice_reference(db: AsyncSession, invoice_id: int, new_reference: str):
    try:
        query = text(f"""
            UPDATE {DB_NAME_USER_NEW}.tbl_salesinvoices_header 
            SET salesinvoicenbr = :ref 
            WHERE id = :id
        """)
        
        result = await db.execute(query, {"ref": new_reference, "id": invoice_id})
        await db.commit()
        return result.rowcount > 0
    except Exception as e:
        print(f"Error updating reference: {e}")
        await db.rollback()
        return False

# 🟢 FIXED BULK UPDATE LOGIC TO PREVENT DUPLICATE ERRORS
async def bulk_update_ar_reference(db: AsyncSession, ar_ids: List[int], new_reference: str):
    try:
        if not ar_ids:
            return 0 

        updated_count = 0

        for ar_id in ar_ids:
            # 🟢 FIXED: Removed the if-index logic that added suffixes like -1, -2
            unique_ref = new_reference

            # 1. Update Details (Preserve DO Linkage)
            preserve_do_query = text(f"""
                UPDATE {DB_NAME_USER_NEW}.tbl_salesinvoices_details d
                INNER JOIN {DB_NAME_FINANCE}.tbl_accounts_receivable ar 
                    ON d.salesinvoicesheaderid = ar.invoice_id
                SET d.DOnumber = :ref
                WHERE ar.ar_id = :id
            """)
            await db.execute(preserve_do_query, {"id": ar_id, "ref": unique_ref})
            
            # 2. Update Finance AR Table
            query_finance = text(f"""
                UPDATE {DB_NAME_FINANCE}.tbl_accounts_receivable 
                SET invoice_no = :ref 
                WHERE ar_id = :id
            """)
            await db.execute(query_finance, {"ref": unique_ref, "id": ar_id})

            # 3. Update Sales Header Table
            query_sales = text(f"""
                UPDATE {DB_NAME_USER_NEW}.tbl_salesinvoices_header
                SET salesinvoicenbr = :ref
                WHERE id IN (
                    SELECT invoice_id 
                    FROM {DB_NAME_FINANCE}.tbl_accounts_receivable 
                    WHERE ar_id = :id
                )
            """)
            await db.execute(query_sales, {"ref": unique_ref, "id": ar_id})
            
            updated_count += 1

        await db.commit()
        return updated_count

    except Exception as e:
        print(f"CRITICAL DB ERROR in bulk_update: {str(e)}")
        await db.rollback()
        return -1