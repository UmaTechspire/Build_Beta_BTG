DROP PROCEDURE IF EXISTS proc_AP_AccountsPayableLedger;

DELIMITER //

CREATE PROCEDURE proc_AP_AccountsPayableLedger (
    IN p_supplier_id INT,
    IN p_currency_id INT,
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    SELECT 
        po.poid AS poid,
        po.pono AS po_no,
        DATE(po.podate) AS po_date,
        po.nettotal AS po_amount,
        gh.grnid AS grnid,
        gh.grnno AS grn_no,
        DATE(gh.grndate) AS grn_date,
        idtl.receiptnote_hdr_id AS irn_id,
        idtl.docno AS irn_no,
        DATE(idtl.docdate) AS irn_date,
        clm.ApplicationNo AS claim_no,
        DATE(clm.CreatedDate) AS claim_date,
        clm.Claim_ID AS claim_id,
        clm.voucherno AS voucher_no,
        clm.IsVoucherGenerate AS is_paid,
        IFNULL(clm.PPP_PV_Director_approve, 0) AS ppp_pv_director_approved,
        IFNULL(clm.PPP_PV_Commissioner_approveone, 0) AS ppp_pv_commissioner_approved,
        (
            SELECT IFNULL(SUM(idat.po_amount), 0)
            FROM btggasify_purchase_live.tbl_IRNReceipt_detail idat
            WHERE idat.poid = po.poid
              AND (gh.grnid IS NULL OR CAST(idat.grn_id AS UNSIGNED) = gh.grnid)
              AND (idtl.receiptnote_hdr_id IS NULL OR idat.receiptnote_hdr_id = idtl.receiptnote_hdr_id)
        ) AS irn_amount,
        (
            SELECT IFNULL(SUM(cdat.TotalAmount), 0)
            FROM btggasify_finance_live.tbl_claimAndpayment_Details cdat
            WHERE cdat.Claim_ID = clm.Claim_ID 
              AND cdat.poid = po.poid 
              AND cdat.IsActive = 1
        ) AS claim_amount,
        clm.ClaimAmountInTC AS claim_header_amount
    FROM btggasify_purchase_live.tbl_purchaseorder_header po
    LEFT JOIN (SELECT DISTINCT grnid, poid FROM btggasify_purchase_live.tbl_grn_detail) gd ON gd.poid = po.poid
    LEFT JOIN btggasify_purchase_live.tbl_grn_header gh ON gh.grnid = gd.grnid
    LEFT JOIN btggasify_purchase_live.tbl_IRNReceipt_detail idtl ON idtl.poid = po.poid AND (gh.grnid IS NULL OR CAST(idtl.grn_id AS UNSIGNED) = gh.grnid)
    LEFT JOIN btggasify_finance_live.tbl_claimAndpayment_Details cdet ON cdet.poid = po.poid AND cdet.IsActive = 1
    LEFT JOIN btggasify_finance_live.tbl_claimAndpayment_header clm ON (clm.irnid = idtl.receiptnote_hdr_id AND clm.irnid IS NOT NULL) OR (clm.Claim_ID = cdet.Claim_ID AND clm.irnid IS NULL)
    WHERE po.isactive = 1
      AND (p_supplier_id = 0 OR po.supplierid = p_supplier_id)
      AND (p_currency_id = 0 OR po.currencyid = p_currency_id)
      AND (p_from_date IS NULL OR DATE(po.podate) >= p_from_date)
      AND (p_to_date IS NULL OR DATE(po.podate) <= p_to_date)
    GROUP BY po.poid, gh.grnid, idtl.receiptnote_hdr_id, clm.Claim_ID;
END //

DELIMITER ;
