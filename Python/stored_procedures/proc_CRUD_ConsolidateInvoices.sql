-- Updated Procedure for "One Header" Consolidation with Date and NULL handling
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_ConsolidateInvoices;
DELIMITER //

CREATE PROCEDURE btggasify_finance_live.proc_CRUD_ConsolidateInvoices(
    IN p_primary_invoice_id INT,
    IN p_source_invoice_id INT,
    IN p_new_ref VARCHAR(100)
)
BEGIN
    DECLARE v_src_amount DECIMAL(18,2);
    DECLARE v_src_qty DECIMAL(18,2);

    -- 1. Get totals from source DO
    SELECT COALESCE(TotalAmount, 0), COALESCE(TotalQty, 0) INTO v_src_amount, v_src_qty 
    FROM btggasify_live.tbl_salesinvoices_header 
    WHERE id = p_source_invoice_id;

    -- 2. Update Primary Header: Set new reference, current date, and add totals
    IF p_primary_invoice_id = p_source_invoice_id THEN
        UPDATE btggasify_live.tbl_salesinvoices_header
        SET salesinvoicenbr = p_new_ref,
            Salesinvoicesdate = CURDATE(),
            isactive = 1
        WHERE id = p_primary_invoice_id;
    ELSE
        -- Add source totals to primary
        UPDATE btggasify_live.tbl_salesinvoices_header
        SET TotalAmount = COALESCE(TotalAmount, 0) + v_src_amount,
            TotalQty = COALESCE(TotalQty, 0) + v_src_qty,
            salesinvoicenbr = p_new_ref,
            Salesinvoicesdate = CURDATE(),
            isactive = 1
        WHERE id = p_primary_invoice_id;

        -- Move all detail items to the primary header
        UPDATE btggasify_live.tbl_salesinvoices_details
        SET salesinvoicesheaderid = p_primary_invoice_id
        WHERE salesinvoicesheaderid = p_source_invoice_id;

        -- Deactivate the source header
        UPDATE btggasify_live.tbl_salesinvoices_header
        SET isactive = 0
        WHERE id = p_source_invoice_id;
        
        -- Deactivate the source record in AR
        UPDATE btggasify_finance_live.tbl_accounts_receivable
        SET is_active = 0
        WHERE invoice_id = p_source_invoice_id;
    END IF;

END //
DELIMITER ;
