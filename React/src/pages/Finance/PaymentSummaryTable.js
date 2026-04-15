import React, { useState, useEffect } from "react";
import { Modal, ModalHeader, ModalFooter, ModalBody, Col, Row, Label, Input, InputGroup, Table } from "reactstrap";
import Swal from "sweetalert2";
import axios from "axios";
import * as XLSX from "xlsx";


import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import { Button } from "primereact/button";
import useAccess from "../../common/access/useAccess";
import {
  DownloadFileById,
  ClaimReject, getClaimDetailsById, ClaimAndPaymentGetById
} from "common/data/mastersapi";

const PaymentSummaryTable = ({ claims, onRefresh, approvedata }) => {

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState({});

  const { access, applyAccessUI } = useAccess("Claim", "Approval");

  useEffect(() => {
    if (!access.loading) {
      applyAccessUI();
    }
  }, [access, applyAccessUI]);

  const [popupRows, setPopupRows] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedSummaryId, setSelectedSummaryId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);

  const [previewUrl, setPreviewUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [convertFromDate, setConvertFromDate] = useState(null);
  const [convertToDate, setConvertToDate] = useState(null);
  const [selectedSumary, setselectedSumary] = useState(null);
  const [cashInHand, setCashInHand] = useState("");
  const [cashFromSales, setCashFromSales] = useState("");
  const [selectedsummaryRows, setselectedsummaryRows] = useState([]);

  // Hierarchical drill-down state
  const [bankSupplierModalVisible, setBankSupplierModalVisible] = useState(false);
  const [selectedBankData, setSelectedBankData] = useState({ bankName: "", suppliers: [] });
  const [claimListModalVisible, setClaimListModalVisible] = useState(false);
  const [selectedSupplierClaims, setSelectedSupplierClaims] = useState([]);

  // Relaxed: include all claims so Cheque payments appear
  const combinedClaims = claims;

  useEffect(() => {
    console.log("DEBUG: All Claims:", claims);
    console.log("DEBUG: Combined Claims:", combinedClaims);
    const excludedClaims = claims.filter(c => !((c.SupplierId && c.SupplierId !== 0) || (c.ApplicantId && c.ApplicantId !== 0)));
    console.log("DEBUG: Excluded Claims:", excludedClaims);
    if (excludedClaims.length > 0) {
      console.log("DEBUG: Excluded Claim Payment Methods:", excludedClaims.map(c => c.PaymentMethod));
    }
  }, [claims, combinedClaims]);
  const [Seqno, setSeqno] = useState("");
  const togglePopup = () => setShowPopup(!showPopup);


  // at top of component
  useEffect(() => {
    if (!approvedata) return;

    setCashInHand({
      CNY: approvedata.InHand_CNY || 0,
      USD: approvedata.InHand_USD || 0,
      SGD: approvedata.InHand_SGD || 0,
      IDR: approvedata.InHand_IDR || 0,
      MYR: approvedata.InHand_MYR || 0,
    });

    setCashFromSales({
      CNY: approvedata.Sales_CNY || 0,
      USD: approvedata.Sales_USD || 0,
      SGD: approvedata.Sales_SGD || 0,
      IDR: approvedata.Sales_IDR || 0,
      MYR: approvedata.Sales_MYR || 0,
    });
    console.log("loff", approvedata);
    setSeqno(approvedata.PaymentNo);
    setConvertFromDate(approvedata.FromDate ? approvedata.FromDate : null);
    setConvertToDate(approvedata.ToDate ? approvedata.ToDate : null);

  }, [approvedata]);

  useEffect(() => {
    setselectedsummaryRows(claims);
  }, [claims]);


  const getSeverity = (Status) => {
    switch (Status) {
      case 'Approved':
        return 'btn-success';
      case 'Discussed':
        return 'btn-warning';
      case 'Posted':
        return 'success';
      case 'Saved':
        return 'danger';
      case 'new':
        return 'info';
      case 'NoAction':
        return 'btn-secondary';
      case 'renewal':
        return null;
    }
  };

  const handleDownloadFile = async () => {
    const fileId = 0;
    const filePath = previewUrl;

    const fileUrl = await DownloadFileById(fileId, filePath);

    // if (fileUrl) {
    //     window.open(fileUrl, "_blank");
    //     setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
    // } else {
    //     Swal.fire({
    //         icon: 'error',
    //         title: 'Download Failed',
    //         text: 'Unable to download the file. Please try again later.',
    //     });
    // }
  };

  const openPopup = async (summaryId, id, type, supplierId, applicantId, modeOfPaymentId, bankId, preloadedRows = null) => {
    // If viewdetails is disabled, do not show popup
    if (!access?.canViewDetails) return;

    console.log("openPopup called with:", { summaryId, id, type, supplierId, applicantId, modeOfPaymentId, bankId, preloadedRows });

    setSelectedSummaryId(summaryId);
    setSelectedId(id);
    setSelectedType(type);

    if (preloadedRows && preloadedRows.length > 0) {
      console.log("Using preloaded rows for popup:", preloadedRows);

      // Map the preloaded rows to match the fields expected by the DataTable
      const mappedRows = preloadedRows.map(row => ({
        ...row,
        claimcategory: row.ClaimCategory,
        transactioncurrency: row.curr,
        totalamountinidr: row.amount,
        // claimno is usually already present as row.claimno, but ensuring it if case differs
        claimno: row.claimno || row.ClaimNo
      }));

      setPopupRows(mappedRows);
      setShowPopup(true);
      return;
    }

    let isDirector = 0;
    if (approvedata.PPP_PV_Director_approve === 0 && approvedata.PPP_PV_Commissioner_approveone === 0) {
      isDirector = 0;
    } else if (approvedata.PPP_PV_Director_approve === 1 && approvedata.PPP_PV_Commissioner_approveone === 0) {
      isDirector = 1;
    }
    try {
      const res = await getClaimDetailsById(
        supplierId == null || supplierId == undefined ? 0 : supplierId,
        applicantId == undefined || applicantId == null ? 0 : applicantId,
        modeOfPaymentId == undefined || modeOfPaymentId == null ? 0 : modeOfPaymentId,
        bankId == undefined || bankId == null ? 0 : bankId,
        1,
        isDirector,
        summaryId
      );
      console.log("getClaimDetailsById response:", res);
      setPopupRows(res.data || []);
      setShowPopup(true);
    } catch (error) {
      console.error("Failed to fetch details:", error);
    }
  };

  const moveBack = async () => {
    Swal.fire({
      title: "Are you sure?",
      text: "Do you want to move this back?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Move Back"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {


          const ids = selectedRows.map(r => ({ "Id": r.Claim_ID }));
          console.log("Removed Items : ", ids);
          try {
            const res = await ClaimReject({ Rej: { Reject: ids, UserId: 1, IsPPP: 0 } }); // replace with your API/service
            if (res.status) {
              Swal.fire("Removed!", "Selected items were removed.", "success");
              if (onRefresh) onRefresh();

              setShowPopup(false);
            } else {
              Swal.fire("Error", res.message || "Failed to remove.", "error");
            }
          } catch (err) {
            console.error(err);
            Swal.fire("Error", "Failed to remove.", "error");
          }





        } catch (err) {
          Swal.fire("Error", "Move back failed", "error");
        }
      }
    });
  };

  const getCurrencies = (data) => {
    const set = new Set();
    data.forEach(row => {
      if (row.curr) set.add(row.curr);
    });
    return Array.from(set);
  };


  const formatWithCommas = (value) => {
    if (!value) return '';
    const parts = value.toString().split('.');
    const intPart = parts[0];
    const decPart = parts[1];
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
  };

  const formatAmount = (value) =>
    value?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const groupKey = (row) => {
    const method = row.PaymentMethod || "-";
    const bank = row.BankName || "-";
    const summary = row.SummaryId || "-";
    return `${summary}||${method}||${bank}`;
  };

  const simplifyBankName = (name) => {
    if (!name || name === "-") return name;
    return name.split(" - ")[0];
  };

  const handlePrint = (seqno) => {
    const printContents = document.getElementById(`printable-summary-${seqno}`).innerHTML;
    const now = new Date();
    const formattedDateTime = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newWin = window.open("", "_blank", "width=1000,height=800");

    newWin.document.write(`
      <html>
        <head>
          <title>Payment Summary Report</title>
          <style>
            @media print {
              .screen-only { display: none !important; }
              .print-only { display: inline-block !important; }
              @page { size: A4 landscape; margin: 10mm; }
            }
            body { font-family: Arial, sans-serif; padding: 10px; color: #000; }
            .header { display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .header img { height: 60px; margin-right: 20px; }
            .header-info h2 { margin: 0; font-size: 20px; }
            .header-info p { margin: 2px 0; font-size: 12px; }
           
            h2.report-title { text-align: center; text-transform: uppercase; letter-spacing: 2px; margin: 20px 0; font-size: 18px; }
           
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th, td { border: 1px solid #000; padding: 6px; text-align: center; color: #000; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-end { text-align: right !important; }
            .text-start { text-align: left !important; }
            .fw-bold { font-weight: bold !important; }
            .table-warning { background-color: #fff9c4 !important; }
            .table-secondary { background-color: #e0e0e0 !important; }
            .table-light { background-color: #f5f5f5 !important; }
           
            .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 10px; border-top: 1px dashed #999; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h2 class="report-title">Payment Summary Report</h2>
         
          <div class="print-container">
            ${printContents}
          </div>

          <div class="footer">
            <div>BTG Finance Management System</div>
            <div>Authorized Signature: ___________________________</div>
          </div>

          <script>
            window.onload = function() {
              // Ensure all screen-only items are hidden and print-only are shown
              setTimeout(() => {
                window.print();
                // window.close(); // Optional: close after print
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    newWin.document.close();
  };

  const getStatusSymbol = (status) => {
    switch (status) {
      case "Approved":
        return "✔"; // Green Tick
      case "Discussed":
        return "✖"; // Red Cross
      default:
        return "⏳"; // Pending Clock
    }
  };

  const handleDetailsPrint = () => {
    const detail = selectedDetail;
    if (!detail) return;

    const now = new Date();
    const formattedDateTime = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const printWindow = window.open('', '', 'width=1000,height=700');

    const printStyles = `
      <style>

       @media print {
                       .print-footer {
         position: fixed;
top: 0;
left: 0;
right: 0;
font-size: 10px;
text-align: right;
border-bottom: 0.5px dashed #999;

height:10px;


      }
.footer {
position: running(pageFooter);  
font-size: 10px;
color: #444;
text-align: right;
}
        @page {
          size: A4 landscape;
       margin: 5mm;
       @bottom-center {
content: element(pageFooter);
}
        }
 
        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          padding: 10px;
          color: #000;
        }
 
        h2 {
          text-align: center;
          margin-bottom: 20px;
          font-size: 16px;
        }
 
        .section-title {
          font-weight: bold;
          margin: 12px 0 5px;
          padding-bottom: 2px;
       
          font-size: 12px;
        }
 
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
 
        .info-table td {
          padding: 4px 6px;
          vertical-align: top;
        }
 
        .info-table td.label {
          font-weight: bold;
          width: 20%;
          white-space: nowrap;
        }
 
        .claim-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
 
       .claim-table th,
.claim-table td {
border: 1px solid #ccc;
padding: 6px;
text-align: center;
word-wrap: break-word;
word-break: break-word;
white-space: normal;
vertical-align: top;
}

.claim-table td:nth-child(1) { width: 3%;text-align: center; }   /* # */
.claim-table td:nth-child(2) { width: 15%;text-align: left; }  /* Claim Type */
.claim-table td:nth-child(3) { width: 23%; text-align: left;}  /* Description */
.claim-table td:nth-child(4) { width: 17%;text-align: right; }  /* Amount */
.claim-table td:nth-child(5) { width: 13%; text-align: center;}  /* Expense Date */
.claim-table td:nth-child(6) { width: 24%;text-align: left; }  /* Purpose */
 
        .status-table {
          width: 100%;
          border-collapse: collapse;
          text-align: center;
          margin-top: 15px;
        }
 
        .status-table th,
        .status-table td {
          border: 1px solid #ccc;
          padding: 6px;
           word-wrap: break-word;
word-break: break-word;
white-space: normal;
vertical-align: top;
        }
 
        .status-header {
          background-color: #eee;
          font-weight: bold;
        }
 
        .btn-circle {
          display: inline-block;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          margin: auto;
        }
 
        .btn-success { background-color: #28a745; }
        .btn-warning { background-color: #ffc107; }
        .btn-secondary { background-color: #6c757d; }
 
        .legend {
          margin-top: 10px;
          font-size: 10px;
        }
 
        .legend span {
          margin-right: 15px;

        }
 
        .remarks-box {
          border: 1px solid #ccc;
          padding: 8px;
          min-height: 30px;
          margin-top: 5px;
            white-space: pre-wrap; /* Preserve line breaks */
word-wrap: break-word;
word-break: break-word;
        }
      </style>
    `;

    const headerInfo = `
    <div style="padding:20px; display: flex; justify-content: space-between; align-items: center;">
<h2 style="margin: 0 auto;padding-left:100px;">Claim Details</h2>
<div style="font-size: 10px; text-align: right;">Printed on: ${formattedDateTime}</div>
</div>
      <table class="info-table">
        <tr>
          <td class="label">Category Type</td><td>${detail.header?.claimcategory || ''}</td>
          <td class="label">Application Date</td><td>${detail.header?.ApplicationDatevw || ''}</td>
        </tr>
        <tr>
          <td class="label">Application No</td><td>${detail.header?.ApplicationNo || ''}</td>
          <td class="label">Applicant</td><td>${detail.header?.applicantname || ''}</td>
        </tr>
        <tr>
          <td class="label">Job Title</td><td>${detail.header?.JobTitle || ''}</td>
          <td class="label">Department</td><td>${detail.header?.departmentname || ''}</td>
        </tr>
        <tr>
          <td class="label">HOD</td><td>${detail.header?.HOD_Name || ''}</td>
          <td class="label">Currency</td><td>${detail.header?.transactioncurrency || ''}</td>
        </tr>
        <tr>
          <td class="label">Cost Center</td><td>${detail.header?.CostCenter || ''}</td>
          <td class="label">Supplier</td><td>${detail.header?.SupplierName || ''}</td>
        </tr>
        <tr>
          <td class="label">Claim Amt in TC</td><td>${detail.header?.ClaimAmountInTC?.toLocaleString('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2
    }) || ''}</td>
          <td class="label">Attachment</td><td>${detail.header?.AttachmentName || 'No Attachment'}</td>
        </tr>
      </table>
    `;

    const detailRows = detail.details.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${row.claimtype || ''}</td>
        <td>${row.PaymentDescription || ''}</td>
        <td>${row.TotalAmount?.toLocaleString('en-US', { style: 'decimal', minimumFractionDigits: 2 }) || ''}</td>
        <td>${row.ExpenseDatevw || ''}</td>
        <td>${row.Purpose || ''}</td>
      </tr>
    `).join('');

    const claimTable = `
    <div style="border-bottom: 1px solid #ccc;padding-top:5px;"></div>
       <table class="claim-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Claim Type</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Expense Date</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          ${detailRows}
        </tbody>
      </table>
    `;

    const remarksSection = `
      <div class="section-title">Remarks</div>
      <div class="remarks-box">
        ${detail.header?.Remarks || ''}
      </div>
    `;

    const statusIndicators = `
   
     <table class="status-table">
      <thead>
        <tr class="status-header">
          <th colspan="2">Claim</th>
          <th colspan="2">PPP</th>
          <th colspan="2">Vouchers</th>
        </tr>
        <tr>
          <th>GM</th><th>Director</th>
          <th>GM</th><th>Director</th>
          <th>Director</th><th>CEO</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          ${[
        detail.header?.ClmgmStatus,
        detail.header?.ClmDrStatus,
        detail.header?.PPPgmStatus,
        detail.header?.PPPDrStatus,
        detail.header?.VouCmrStatus,
        detail.header?.VouDrStatus
      ].map((status) => {
        const symbol = getStatusSymbol(status);
        return `<td style="font-size: 16px;">${symbol}</td>`;
      }).join('')}
        </tr>
      </tbody>
    </table>
   
     <div class="legend" style="margin-top: 10px; font-size: 10px;">
      <span>✔ Approved</span>
      <span>✖ Discussed</span>
      <span>⏳ Yet to Act</span>
    </div>

  `;


    printWindow.document.write(`
      <html>
        <head>
          <title>Claim Details</title>
          ${printStyles}
        </head>
        <body>
          ${headerInfo}
          ${claimTable}
          ${remarksSection}
          ${statusIndicators}
         
        </body>
      </html>
    `);


    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  };

  const handleShowDetails = async (row) => {
    console.log("=== PAYMENT SUMMARY TABLE - handleShowDetails ===");
    console.log("Row data:", row);
    console.log("Calling ClaimAndPaymentGetById with:", row.id, 1, 1);

    const res = await ClaimAndPaymentGetById(row.id, 1, 1);

    console.log("API Response:", res);
    console.log("Response status:", res?.status);
    console.log("Response data:", res?.data);
    console.log("Response data.header:", res?.data?.header);
    console.log("Response data.details:", res?.data?.details);

    if (res.status) {

      setSelectedDetail(res.data);
      setDetailVisible(true);
      setPreviewUrl(res.data?.header?.AttachmentPath || "");
      setFileName(res.data?.header?.AttachmentName || "");

    }
    else {
      Swal.fire("Error", "Data is not available", "error");

    }
  };

  // Handler for Bank click - shows supplier list popup
  const handleBankClick = (bankName, bankRows) => {
    // Group by supplier/applicant
    const supplierMap = {};
    bankRows.forEach(row => {
      const key = row.SupplierId ? `sup-${row.SupplierId}` : (row.ApplicantId ? `app-${row.ApplicantId}` : `other-${row.id}`);
      // Use SupplierName if it's a valid non-empty string, otherwise fall back to ApplicantName
      const name = (row.SupplierName && row.SupplierName !== 0 && row.SupplierName !== "0")
        ? row.SupplierName
        : (row.ApplicantName || "");
      if (!supplierMap[key]) {
        supplierMap[key] = {
          id: row.SupplierId || row.ApplicantId,
          name: name,
          supplierId: row.SupplierId,
          applicantId: row.ApplicantId,
          claims: [],
          totals: {}
        };
      }
      supplierMap[key].claims.push(row);
    });

    // Calculate totals per supplier per currency
    const currencies = ["IDR", "SGD", "USD", "MYR", "CNY"];
    Object.values(supplierMap).forEach(supplier => {
      currencies.forEach(curr => {
        supplier.totals[curr] = supplier.claims
          .filter(c => c.curr === curr)
          .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
      });
    });

    setSelectedBankData({
      bankName,
      suppliers: Object.values(supplierMap)
    });
    setBankSupplierModalVisible(true);
  };

  // Handler for Supplier click in bank modal - shows claim list
  const handleSupplierClick = (supplier) => {
    setSelectedSupplierClaims(supplier.claims);
    setClaimListModalVisible(true);
  };

  // Handler for Claim click - shows claim details
  const handleClaimClick = async (claim) => {
    await handleShowDetails(claim);
  };

  const buildTable = (title, data) => {
    if (!data || data.length === 0) return null;

    const currencies = ["IDR", "SGD", "USD", "MYR", "CNY"];

    // split data
    if (data.length > 0) {
      console.log("DEBUG buildTable: Sample row KEYS:", Object.keys(data[0]));
      console.log("DEBUG buildTable: Sample row FULL:", JSON.stringify(data[0], null, 2));
    }

    const cashWithdrawalData = data.filter(r => r.PaymentMethod === "Cash Withdrawal");
    const cashAloneData = data.filter(r => r.PaymentMethod === "Cash");
    const otherData = data.filter(r => r.PaymentMethod !== "Cash Withdrawal" && r.PaymentMethod !== "Cash");

    // normal grouping (for non-cash-withdrawal)
    const grouped = {};
    otherData.forEach(row => {
      // debugger;
      const summaryId = row.SummaryId || "-";
      const method = (row.PaymentMethod || "-").trim();
      const bank = (row.BankName || "-").trim();

      // Defined these for use in grouped object below
      const nameKey = row.SupplierId || row.ApplicantId || 0;
      // Use SupplierName if it's a valid non-empty string, otherwise fall back to ApplicantName
      const groupId = (row.SupplierName && row.SupplierName !== 0 && row.SupplierName !== "0")
        ? row.SupplierName
        : (row.ApplicantName || "");

      // Robust Grouping Key:
      // 1. Prefer SupplierId if available, else ApplicantId.
      // 2. Normalize ID (so 0 and null don't split).
      // 3. Last resort unique key if neither exists
      let normalizedId = "unknown";
      if (row.SupplierId) normalizedId = `sup-${row.SupplierId}`;
      else if (row.ApplicantId) normalizedId = `app-${row.ApplicantId}`;
      else if (groupId) normalizedId = `name-${groupId}`; // Fallback to name-based grouping if IDs are missing
      else normalizedId = `other-${row.id || Math.random()}`; // Last resort

      const key = `${method}||${bank}||${normalizedId}`;


      if (!grouped[key]) grouped[key] = {
        rows: [],
        groupName: groupId,
        summaryId,
        method,
        bank,
        id: nameKey,
        supplierId: row.SupplierId,
        applicantId: row.ApplicantId,
        modeOfPaymentId: row.ModeOfPaymentId,
        bankId: row.BankId
      };
      grouped[key].rows.push(row);
    });

    // totals
    const overallTotals = currencies.reduce((acc, curr) => {
      acc[curr] = data
        .filter(r => r.curr === curr)
        .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
      return acc;
    }, {});
    console.log("DEBUG buildTable: data length:", data.length, "overallTotals:", overallTotals);

    // Debug: Check Cheque claims specifically
    const chequeClaims = data.filter(r => (r.PaymentMethod || "").toLowerCase().includes("cheque"));
    console.log("DEBUG buildTable: Cheque claims count:", chequeClaims.length);
    if (chequeClaims.length > 0) {
      console.log("DEBUG buildTable: Cheque claims sample:", chequeClaims.slice(0, 3).map(c => ({
        PaymentMethod: c.PaymentMethod,
        ClaimCategory: c.ClaimCategory,
        curr: c.curr,
        amount: c.amount,
        SupplierId: c.SupplierId,
        ApplicantId: c.ApplicantId,
        BankName: c.BankName,
        BankId: c.BankId,
        DepositBankId: c.deposit_bank_id
      })));
      if (data.length > 0) console.log("DEBUG FIRST ROW FULL:", data[0]);
    }

    // cash withdrawal grouped by bank
    const cashGrouped = Object.values(
      cashWithdrawalData.reduce((acc, row) => {
        const bankKey = row.BankName || "-";
        if (!acc[bankKey]) acc[bankKey] = {
          ...row,
          bank: bankKey,
          rows: []
        };
        acc[bankKey].rows.push(row);
        return acc;
      }, {})
    );

    return (
      <>
        <table className="paymentsummarypv table text-center mt-3">
          <thead className="table-light">
            <tr>
              <th>Mode Of Payment</th>
              <th>Bank Name</th>
              <th>Supplier / Applicant Name</th>
              {currencies.map(curr => (
                <th key={curr}>{curr}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Group by Bank first, then show suppliers */}
            {(() => {
              // First, group the grouped data by bank
              const groupedArray = Object.values(grouped).filter(group => {
                const rowTotals = currencies.reduce((acc, curr) => {
                  acc[curr] = group.rows
                    .filter(r => r.curr === curr)
                    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
                  return acc;
                }, {});
                return currencies.some(curr => rowTotals[curr] > 0);
              });

              // Sort by payment method priority: Bank Transfer first, then Cheque, then others
              // Secondary sort by bank name to keep same-bank entries together
              const methodPriority = (method) => {
                const m = (method || "").toLowerCase();
                if (m.includes("bank transfer")) return 1;
                if (m.includes("cheque")) return 2;
                if (m.includes("cash")) return 3;
                return 4;
              };
              groupedArray.sort((a, b) => {
                const mp = methodPriority(a.method) - methodPriority(b.method);
                if (mp !== 0) return mp;
                return (a.bank || "").localeCompare(b.bank || "");
              });

              const rows = [];
              groupedArray.forEach((group, index) => {
                const rowTotals = currencies.reduce((acc, curr) => {
                  acc[curr] = group.rows
                    .filter(r => r.curr === curr)
                    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
                  return acc;
                }, {});

                const bankName = group.bank || "-";

                rows.push(
                  <tr key={`row-${index}`}>
                    <td style={{ textAlign: "left" }}>{group.method}</td>
                    <td style={{ textAlign: "left" }}>
                      <span
                        className="linkcolor"
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          const bankRows = data.filter(r => (r.BankName || "-") === bankName);
                          handleBankClick(bankName, bankRows);
                        }}
                      >
                        {simplifyBankName(bankName)}
                      </span>
                    </td>
                    <td style={{ textAlign: "left" }}>
                      <span
                        className="linkcolor"
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          openPopup(group.summaryId, group.id, "Party",
                            group.supplierId, group.applicantId,
                            group.modeOfPaymentId, group.bankId, group.rows)
                        }
                      >
                        {group.groupName}
                      </span>
                    </td>
                    {currencies.map(curr => (
                      <td style={{ textAlign: "right" }} key={curr}>
                        {rowTotals[curr]
                          ? rowTotals[curr].toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : "0.00"}
                      </td>
                    ))}
                  </tr>
                );
              });

              return rows;
            })()}

            {/* Cash Alone Row - Only show if there's data */}
            {(() => {
              if (!cashAloneData || cashAloneData.length === 0) return null;

              const cashTotals = currencies.reduce((acc, curr) => {
                acc[curr] = cashAloneData
                  .filter(r => r.curr === curr)
                  .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
                return acc;
              }, {});

              // Check if all amounts are zero
              const hasNonZeroAmount = currencies.some(curr => cashTotals[curr] > 0);
              if (!hasNonZeroAmount) return null;

              return (
                <tr key="cash-alone-row">
                  <td style={{ textAlign: "left" }}>Cash</td>
                  <td style={{ textAlign: "left" }}>-</td>
                  <td className="linkcolor"
                    style={{ textAlign: "left", cursor: "pointer" }}
                    onClick={() =>
                      openPopup(cashAloneData[0]?.SummaryId || 0, 0, "Party", 0, 0, cashAloneData[0]?.ModeOfPaymentId || 0, 0, cashAloneData)
                    }
                  >
                    Multiple
                  </td>
                  {currencies.map(curr => (
                    <td style={{ textAlign: "right" }} key={curr}>
                      {cashTotals[curr]
                        ? cashTotals[curr].toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : "0.00"}
                    </td>
                  ))}
                </tr>
              );
            })()}

            {/* Cash Withdrawal rows - only show if at least one currency has non-zero amount */}
            {cashGrouped.map((cg, i) => {
              const rowTotals = currencies.reduce((acc, curr) => {
                acc[curr] = cg.rows
                  .filter(r => r.curr === curr)
                  .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
                return acc;
              }, {});

              // Check if all amounts are zero
              const hasNonZeroAmount = currencies.some(curr => rowTotals[curr] > 0);
              if (!hasNonZeroAmount) return null;

              return (
                <tr key={`cw-${i}`} style={{ backgroundColor: "#fff7e6" }}>
                  <td style={{ textAlign: "left" }}>Cash Withdrawal</td>
                  <td style={{ textAlign: "left" }}>{simplifyBankName(cg.bank)}</td>
                  <td className="linkcolor"
                    style={{ textAlign: "left", cursor: "pointer" }}
                    onClick={() =>
                      openPopup(cg.SummaryId, cg.SupplierId || cg.ApplicantId, "Party", 0, 0, cg.ModeOfPaymentId, cg.BankId, cg.rows)
                    }
                  >
                    N/A
                  </td>
                  {currencies.map(curr => (
                    <td style={{ textAlign: "right" }} key={curr}>
                      {rowTotals[curr]
                        ? rowTotals[curr].toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : "0.00"}
                    </td>
                  ))}
                </tr>
              );
            })}

            {/* Cash in Hand */}
            <tr style={{ backgroundColor: "#e8f4ff", fontWeight: "bold" }}>
              <td colSpan={3} style={{ textAlign: "left" }}>Cash in Hand</td>
              {currencies.map(curr => (
                <td style={{ textAlign: "right" }} key={`cashinhand-${curr}`}>
                  -{((cashInHand[curr] || 0) + (cashFromSales[curr] || 0)).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </td>
              ))}
            </tr>

            {/* Total */}
            <tr style={{ backgroundColor: "#f1f1f1", fontWeight: "bold" }}>
              <td colSpan={3}>Total</td>
              {currencies.map(curr => {
                const netTotal = (overallTotals[curr] || 0) - ((cashInHand[curr] || 0) + (cashFromSales[curr] || 0));
                return (
                  <td style={{ textAlign: "right" }} key={`total-${curr}`}>
                    {netTotal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                );
              })}
            </tr>

            {/* Cash Withdraw */}
            <tr style={{ backgroundColor: "#fff3cd", fontWeight: "bold" }}>
              <td colSpan={3} style={{ textAlign: "left" }}>Cash Withdraw</td>
              {currencies.map(curr => {
                const modeOfCashTotal = data
                  .filter(r => r.PaymentMethod === "Cash" || r.PaymentMethod === "Cash Withdrawal")
                  .filter(r => r.curr === curr)
                  .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

                const cihValue = parseFloat(cashInHand[curr] || 0);
                const cfsValue = parseFloat(cashFromSales[curr] || 0);
                const cashNeededVal = modeOfCashTotal - cihValue - cfsValue;

                return (
                  <td style={{ textAlign: "right" }} key={`cashneeded-${curr}`}>
                    {cashNeededVal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                );
              })}
            </tr>

            {/* Round Off */}
            <tr style={{ backgroundColor: "#fff5cc", fontWeight: "bold" }}>
              <td colSpan={3} style={{ textAlign: "left" }}>Round Off</td>
              {currencies.map(curr => {
                const modeOfCashTotal = data
                  .filter(r => r.PaymentMethod === "Cash" || r.PaymentMethod === "Cash Withdrawal")
                  .filter(r => r.curr === curr)
                  .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

                const cihValue = parseFloat(cashInHand[curr] || 0);
                const cfsValue = parseFloat(cashFromSales[curr] || 0);
                const cashNeededVal = modeOfCashTotal - cihValue - cfsValue;

                const roundOffVal = curr === "IDR" ? (Math.round(cashNeededVal / 100) * 100) - cashNeededVal : 0;

                return (
                  <td style={{ textAlign: "right" }} key={`roundoff-${curr}`}>
                    {roundOffVal > 0 ? "+" : ""}{roundOffVal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                );
              })}
            </tr>

            {/* Net Cash Withdraw */}
            <tr style={{ backgroundColor: "#fffbbd", fontWeight: "bold" }}>
              <td colSpan={3} style={{ textAlign: "left" }}>Net Cash Withdraw</td>
              {currencies.map(curr => {
                const modeOfCashTotal = data
                  .filter(r => r.PaymentMethod === "Cash" || r.PaymentMethod === "Cash Withdrawal")
                  .filter(r => r.curr === curr)
                  .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

                const cihValue = parseFloat(cashInHand[curr] || 0);
                const cfsValue = parseFloat(cashFromSales[curr] || 0);
                const cashNeededVal = modeOfCashTotal - cihValue - cfsValue;

                // Round to nearest 100 only for IDR
                const netCashWithdraw = curr === "IDR" ? Math.round(cashNeededVal / 100) * 100 : cashNeededVal;

                return (
                  <td style={{ textAlign: "right" }} key={`netcashneeded-${curr}`}>
                    {netCashWithdraw.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

      </>
    );
  };



  const supplierClaims = claims.filter(c => c.SupplierId && c.SupplierId !== 0);
  const applicantClaims = claims.filter(c => c.ApplicantId && c.ApplicantId !== 0);

  return (

    <>

      <br />
      {(() => {
        const currencies = ["IDR", "SGD", "USD", "MYR", "CNY"];


        const getAmountForCategoryCurrency = (category, currency, cashOnly = null) => {
          if (cashOnly == "Cash") {
            return selectedsummaryRows
              .filter(r =>
                r.curr === currency &&
                (r.PaymentMethod || "").toLowerCase() === "Cash Withdrawal"
              )
              .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
          }
          else {
            return selectedsummaryRows
              .filter(r => {
                const rCat = (r.ClaimCategory || "").toLowerCase().trim();
                const targetCat = (category || "").toLowerCase().trim();
                return (
                  rCat === targetCat &&
                  r.curr === currency &&
                  (r.PaymentMethod || "").toLowerCase() !== "cash withdrawal"
                );
              })
              .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
          }
        };

        // const getAmountForCategoryCurrency = (category, currency ) => {


        //     if(selectedsummaryRows.length > 0){
        //       debugger;
        //     }
        //   return selectedsummaryRows
        //     .filter(r =>
        //       r.ClaimCategory === category &&
        //       r.curr === currency

        //     )
        //     .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

        // };


        const getTotalA = () => {
          return currencies.reduce((acc, curr) => {
            const val = parseFloat(cashInHand[curr] || 0) + parseFloat(cashFromSales[curr] || 0);
            return { ...acc, [curr]: val };
          }, {});
        };

        const getTotalB = () => {
          return currencies.reduce((acc, curr) => {
            // For Total B, we sum ALL payment categories (Claim, Cash Advance, Supplier Payment)
            // regardless of payment method
            const total = ["Claim", "Cash Advance", "Supplier Payment"]
              .reduce((sum, cat) => {
                const filtered = selectedsummaryRows.filter(r => {
                  const rCat = (r.ClaimCategory || "").toLowerCase().trim();
                  const targetCat = cat.toLowerCase().trim();
                  return rCat === targetCat && r.curr === curr;
                });
                const categoryTotal = filtered.reduce((s, r) => s + parseFloat(r.amount || 0), 0);

                return sum + categoryTotal;
              }, 0);

            return { ...acc, [curr]: total };
          }, {});
        };

        // const getTotalB = () => {
        //   return currencies.reduce((acc, curr) => {
        //     const val = ["Claim", "Cash Advance", "Supplier Payment"]
        //       .reduce((sum, cat) =>
        //         sum + getAmountForCategoryCurrency(cat, curr, "Cash")
        //       , 0);
        //     return { ...acc, [curr]: val };
        //   }, {});
        // };

        const getCashNeeded = () => {
          const A = getTotalA();
          const B = getTotalB();
          return currencies.reduce((acc, curr) => {
            return { ...acc, [curr]: (B[curr] || 0) - (A[curr] || 0) };
          }, {});
        };

        const getBankPayment = () => {
          return currencies.reduce((acc, curr) => {
            const val = getAmountForCategoryCurrency("Bank Payment", curr, "Bank Transfer");
            return { ...acc, [curr]: val };
          }, {});
        };

        const handleExportExcel = () => {
          const currencies = ["IDR", "SGD", "USD", "MYR", "CNY"];
          const aoa = [];

          // 1. Report Title & Info
          aoa.push([`Payment Summary Report - ${Seqno}`]);
          aoa.push([`Payment Plan Date: ${new Date(convertFromDate).toLocaleDateString("en-GB")} - ${new Date(convertToDate).toLocaleDateString("en-GB")}`]);
          aoa.push([]);

          // 2. Summary Table Section
          aoa.push(["SUMMARY SECTION"]);
          aoa.push(["Category", ...currencies]);

          const cashNeeded = getCashNeeded();
          aoa.push(["Cash Needed (B - A)", ...currencies.map(curr => cashNeeded[curr] || 0)]);
          aoa.push(["Cash in Hand", ...currencies.map(curr => cashInHand[curr] || 0)]);
          aoa.push(["Cash from Factory Sales", ...currencies.map(curr => cashFromSales[curr] || 0)]);

          const totalA = getTotalA();
          aoa.push(["Total A", ...currencies.map(curr => totalA[curr] || 0)]);

          ["Claim", "Cash Advance", "Supplier Payment"].forEach(category => {
            aoa.push([category, ...currencies.map(curr => getAmountForCategoryCurrency(category, curr))]);
          });

          const totalB = getTotalB();
          aoa.push(["Total B", ...currencies.map(curr => totalB[curr] || 0)]);
          aoa.push([]);

          // 3. Detailed Breakdown Section
          aoa.push(["DETAILED BREAKDOWN"]);
          aoa.push(["Mode Of Payment", "Bank Name", "Supplier / Applicant Name", ...currencies]);

          // Mimic buildTable grouping logic for Excel
          const data = selectedsummaryRows || [];
          const otherData = data.filter(r => r.PaymentMethod !== "Cash Withdrawal" && r.PaymentMethod !== "Cash");
          const grouped = {};

          otherData.forEach(row => {
            const method = (row.PaymentMethod || "-").trim();
            const bank = (row.BankName || "-").trim();
            const groupId = (row.SupplierName && row.SupplierName !== 0 && row.SupplierName !== "0")
              ? row.SupplierName
              : (row.ApplicantName || "");

            let normalizedId = "unknown";
            if (row.SupplierId) normalizedId = `sup-${row.SupplierId}`;
            else if (row.ApplicantId) normalizedId = `app-${row.ApplicantId}`;
            else if (groupId) normalizedId = `name-${groupId}`;

            const key = `${method}||${bank}||${normalizedId}`;
            if (!grouped[key]) grouped[key] = { groupName: groupId, method, bank, rows: [] };
            grouped[key].rows.push(row);
          });

          // Group by bank for organized rows
          const bankGroups = {};
          Object.values(grouped).forEach(group => {
            const bankKey = group.bank || "-";
            if (!bankGroups[bankKey]) bankGroups[bankKey] = [];
            bankGroups[bankKey].push(group);
          });

          Object.entries(bankGroups).forEach(([bankName, suppliers]) => {
            suppliers.forEach((group) => {
              const rowTotals = currencies.map(curr => {
                return group.rows
                  .filter(r => r.curr === curr)
                  .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
              });

              if (rowTotals.some(val => val > 0)) {
                aoa.push([group.method, simplifyBankName(bankName), group.groupName, ...rowTotals]);
              }
            });
          });

          // 4. Detailed Footers (Matches Screen UI)
          const overallTotals = currencies.map(curr => {
            return data
              .filter(r => r.curr === curr)
              .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
          });

          // Cash in Hand (Negative subtotal)
          const cihFooter = currencies.map(curr => {
            return -((cashInHand[curr] || 0) + (cashFromSales[curr] || 0));
          });
          aoa.push(["", "", "Cash in Hand", ...cihFooter]);

          // Net Total
          const netTotalFooter = currencies.map((curr, idx) => {
            return (overallTotals[idx] || 0) + (cihFooter[idx] || 0);
          });
          aoa.push(["", "", "Total", ...netTotalFooter]);

          // Cash Withdraw (Final Needed)
          const cashWithdrawFooter = currencies.map(curr => {
            const modeOfCashTotal = data
              .filter(r => r.PaymentMethod === "Cash" || r.PaymentMethod === "Cash Withdrawal")
              .filter(r => r.curr === curr)
              .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
            const cihValue = parseFloat(cashInHand[curr] || 0);
            const cfsValue = parseFloat(cashFromSales[curr] || 0);
            return modeOfCashTotal - cihValue - cfsValue;
          });
          aoa.push(["", "", "Cash Withdraw", ...cashWithdrawFooter]);

          // Net Cash Withdraw
          const netCashWithdrawFooter = cashWithdrawFooter.map((val, idx) => currencies[idx] === "IDR" ? Math.round(val / 100) * 100 : val);
          aoa.push(["", "", "Net Cash Withdraw", ...netCashWithdrawFooter]);

          aoa.push([]);
          // Final Footer
          aoa.push([]);
          aoa.push(["", "", "Authorized Signature: ___________________________"]);

          // Create and save Workbook
          const ws = XLSX.utils.aoa_to_sheet(aoa);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Payment Summary");
          XLSX.writeFile(wb, `Payment_Summary_${Seqno}.xlsx`);
        };

        const totalA = getTotalA();
        const totalB = getTotalB();
        const cashNeeded = getCashNeeded();
        const bankPayment = getBankPayment();



        return (
          <>

            <>
              <style>
                {`


      @media screen {
        .print-only { display: none !important; }
      }
    `}
              </style>

              {/* Your existing JSX goes here */}
            </>
            <div className="text-end mb-3 no-print">
              {access?.canPrint && (
                <Button
                  icon="pi pi-print"
                  label="Print"
                  className="p-button-sm p-button-secondary"
                  onClick={() => handlePrint(Seqno)}
                />
              )}
              {access?.canPrint && (
                <Button
                  icon="pi pi-file-excel"
                  label="Export"
                  className="p-button-sm p-button-success ms-2"
                  onClick={handleExportExcel}
                />
              )}
            </div>
            <div id={`printable-summary-${Seqno}`}>

              <h3 className="print-only" >
                Payment Plan Date: {new Date(convertFromDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                - {new Date(convertToDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                / PPP No: {Seqno}
              </h3>


              <table className="table table-sm table-bordered align-middle mb-2">
                <thead>
                  <tr className="table-secondary">
                    <th>Category</th>
                    {currencies.map(curr => (
                      <th key={curr} className="text-center">{curr}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* First row: Cash Needed */}
                  <tr className="table-warning fw-bold">
                    <td style={{ textAlign: "left", fontWeight: "bold" }}>Cash Needed (B - A)</td>
                    {currencies.map(curr => (
                      <td key={`cashNeeded-${curr}`} className="text-end" style={{ textAlign: "right", fontWeight: "bold" }}>
                        {cashNeeded[curr]?.toLocaleString()}
                      </td>
                    ))}
                  </tr>

                  {/* Cash In Hand */}
                  <tr>
                    <td style={{ textAlign: "left" }}>Cash in Hand</td>
                    {currencies.map(curr => (
                      <td key={`cih-${curr}`} style={{ textAlign: "right" }}>

                        <span className="print-only"  >
                          {Number(cashInHand[curr] || 0).toLocaleString()}
                        </span>

                        <Input
                          type="text"
                          disabled={true}
                          className="text-end screen-only"
                          value={formatWithCommas(cashInHand[curr])}
                          onChange={e =>
                            setCashInHand({ ...cashInHand, [curr]: e.target.value })
                          }
                        />
                      </td>
                    ))}
                  </tr>

                  {/* Cash From Sales */}
                  <tr>
                    <td style={{ textAlign: "left" }}>Cash from Factory Sales</td>
                    {currencies.map(curr => (
                      <td key={`cfs-${curr}`} style={{ textAlign: "right" }}>


                        <span className="print-only" style={{ textAlign: "right" }}>
                          {Number(cashFromSales[curr] || 0).toLocaleString()}
                        </span>
                        <Input
                          type="text"
                          disabled={true}
                          className="text-end screen-only"
                          value={formatWithCommas(cashFromSales[curr])}
                          onChange={e =>
                            setCashFromSales({ ...cashFromSales, [curr]: e.target.value })
                          }
                        />
                      </td>
                    ))}
                  </tr>

                  {/* Total A */}
                  <tr className="table-light fw-bold">
                    <td style={{ fontWeight: "bold", textAlign: "left" }}>Total A</td>
                    {currencies.map(curr => (
                      <td key={`totalA-${curr}`} style={{ textAlign: "right", fontWeight: "bold" }} className="text-end">
                        {totalA[curr]?.toLocaleString()}
                      </td>
                    ))}
                  </tr>


                  {["Claim", "Cash Advance", "Supplier Payment"].map(category => (
                    <tr key={category}>
                      <td style={{ textAlign: "left" }}>{category}</td>
                      {currencies.map(curr => {
                        const method =
                          category === "Cash Withdrawal"
                            ? "Cash"     // only Cash for Cash Withdrawal row
                            : "NonCash"; // exclude Cash everywhere else
                        return (
                          <td key={`${category}-${curr}`} className="text-end" style={{ textAlign: "right" }}>
                            {getAmountForCategoryCurrency(category, curr, method).toLocaleString()}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Total B */}
                  <tr className="table-light fw-bold">
                    <td style={{ fontWeight: "bold", textAlign: "left" }}>Total B</td>
                    {currencies.map(curr => (
                      <td key={`totalB-${curr}`} style={{ fontWeight: "bold", textAlign: "right" }} className="text-end">
                        {totalB[curr]?.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              <br />

              {buildTable("Party", combinedClaims)}
            </div>
          </>
        );
      })()}

      {/* {buildTable("Supplier", supplierClaims, true)}
      {buildTable("Applicant", applicantClaims, false)} */}



      <Modal isOpen={showPopup} toggle={togglePopup} size="xl">
        <ModalHeader toggle={togglePopup}>Claim Details</ModalHeader>
        <ModalBody>
          <DataTable
            value={popupRows}
            selection={selectedRows}
            onSelectionChange={e => setSelectedRows(e.value)}
            paginator
            rows={10}
            className="PPP_Datatable"
            dataKey="Claim_ID"
            responsiveLayout="scroll"
            selectionMode="checkbox"
          >
            <Column selectionMode="multiple" headerStyle={{ width: '3em' }}  ></Column>
            {/* <Column field="claimno" header="Claim No"></Column> */}

            <Column header="Claim#" body={(rowData) => (

              <span id={`tt-${rowData.claimno}`} style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => {
                handleShowDetails(rowData);
              }}>
                {rowData.claimno}

              </span>


            )} />
            <Column field="claimcategory" header="Claim Category"></Column>
            <Column field="totalamountinidr" header="Amount" body={(row) => formatAmount(row.totalamountinidr)}></Column>
            <Column field="transactioncurrency" header="Currency"></Column>

          </DataTable>

          <div className="text-end mt-3">
            <button className="btn btn-danger" onClick={moveBack}>Move Back</button>
          </div>
        </ModalBody>
      </Modal>


      <Modal isOpen={detailVisible} toggle={() => setDetailVisible(false)} size="xl">
        <ModalHeader toggle={() => setDetailVisible(false)}>Claim Details</ModalHeader>
        <ModalBody>
          {/* {selectedDetail!=undefined && selectedDetail !=null && selectedDetail.header !=undefined && selectedDetail.header !=null && ( */}
          {1 == 1 && (
            <>
              <Row form>
                {[
                  ["Category Type ", selectedDetail.header?.claimcategory],
                  ["Application Date", selectedDetail.header?.ApplicationDatevw],
                  ["Application No", selectedDetail.header?.ApplicationNo],
                  ["Department ", selectedDetail.header?.departmentname],
                  ["Applicant ", selectedDetail.header?.applicantname],
                  ["Job Title", selectedDetail.header?.JobTitle],
                  ["HOD", selectedDetail.header?.HOD_Name],
                  ["Trans Currency ", selectedDetail.header?.transactioncurrency],
                  ["Attachment ", selectedDetail.header?.AttachmentName ? (
                    <button
                      type="button"
                      className="btn d-flex align-items-center justify-content-between"
                      onClick={handleDownloadFile}
                      key="attachment"
                      style={{
                        height: "10px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          flexGrow: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "blue"
                        }}
                        title={fileName}
                      >
                        {fileName}
                      </span>
                      <i className="mdi mdi-cloud-download mdi-24px text-primary ms-2"></i>
                    </button>
                  ) : (
                    "No Attachment"
                  )
                  ],


                  ["Cost Center", selectedDetail.header?.CostCenter],
                  ["Claim Amt in TC", <span key="amtintc"> {selectedDetail.header?.ClaimAmountInTC?.toLocaleString('en-US', {
                    style: 'decimal',
                    minimumFractionDigits: 2
                  })}</span>],
                  ["Supplier", selectedDetail.header?.SupplierName],
                ].map(([label, val], i) => (
                  <Col md="4" key={i} className="form-group row ">
                    <Label className="col-sm-4 col-form-label bold">{label}</Label>
                    <Col sm="8" className="mt-2">: {val}</Col>
                  </Col>
                ))}
              </Row>
              <hr />
              <DataTable value={selectedDetail.details}>
                <Column headerStyle={{ textAlign: 'center' }} header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                <Column headerStyle={{ textAlign: 'center' }} field="claimtype" header="Claim Type" />
                <Column headerStyle={{ textAlign: 'center' }} field="PaymentDescription" header="Claim & Payment Description" />
                <Column style={{ textAlign: "right" }} field="TotalAmount" header="Amount"
                  body={(rowData) =>
                    rowData.TotalAmount?.toLocaleString('en-US', {
                      style: 'decimal',
                      minimumFractionDigits: 2
                    })
                  } />
                <Column headerStyle={{ textAlign: 'center' }} field="ExpenseDatevw" header="Expense Date" />
                <Column headerStyle={{ textAlign: 'center' }} field="Purpose" header="Purpose" />
              </DataTable>

              <Row className="mt-3">
                <Col>
                  <Label>Remarks</Label>
                  <Input type="textarea" rows="2" disabled value={selectedDetail.header?.Remarks} />
                </Col>
              </Row>







              <Row className="mt-3">
                <Col>


                  <Table className="table mt-3" style={{ width: "76%" }}>
                    <thead style={{ backgroundColor: "#3e90e2" }}>
                      {/* <table className="table table-bordered text-center">
                                    <thead> */}
                      <tr>
                        <th style={{ padding: "0px", width: "18%", backgroundColor: "#B4DBE0" }} className="text-center" colSpan="2">Claim</th>
                        <th style={{ padding: "0px", width: "12%", backgroundColor: "#E6E4BC" }} className="text-center" colSpan="2">PPP</th>
                        <th style={{ padding: "0px", width: "10%", backgroundColor: "#FFE9F5" }} className="text-center" colSpan="2">Vouchers</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th style={{ padding: "0px", backgroundColor: "#B4DBE0" }} className="text-center">GM</th>
                        <th style={{ padding: "0px", backgroundColor: "#B4DBE0" }} className="text-center">Director</th>
                        <th style={{ padding: "0px", backgroundColor: "#E6E4BC" }} className="text-center">GM</th>
                        <th style={{ padding: "0px", backgroundColor: "#E6E4BC" }} className="text-center">Director</th>
                        <th style={{ padding: "0px", backgroundColor: "#FFE9F5" }} className="text-center">Director</th>
                        <th style={{ padding: "0px", backgroundColor: "#FFE9F5" }} className="text-center">CEO</th>

                      </tr>
                      <tr>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.ClmgmStatus)}`} /></td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.ClmDrStatus)}`} /></td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.PPPgmStatus)}`} /></td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.PPPDrStatus)}`} /></td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.VouCmrStatus)}`} /> </td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.VouDrStatus)}`} /> </td>
                      </tr>
                    </tbody>
                  </Table>

                  <br />
                </Col>
              </Row>

              <Row className="mt-3">
                <Col>

                  <div className="col-12 col-lg-6 text-left" >
                    <span className="me-3">
                      <Button

                        className={`btn-circle p-button-rounded btn btn-success`}

                      /> Approved</span>
                    <span className="me-3"><Button

                      className={`btn-circle p-button-rounded  btn btn-warning`}
                    /> Discussed</span>

                    <span className="me-3"><Button className={`btn-circle p-button-rounded  btn btn-secondary`} /> Yet to Act </span>
                  </div>
                  <div className="col-12 col-lg-6 text-end"></div>
                </Col>
              </Row>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {access?.canPrint && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleDetailsPrint()}
            >
              <i className="mdi mdi-printer font-size-16 me-2"></i> Print
            </button>)}
          <button type="button" className="btn btn-danger" onClick={() => setDetailVisible(false)}> <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Close</button>

        </ModalFooter>
      </Modal>

      {/* Bank Supplier Modal - Shows suppliers for selected bank */}
      <Modal isOpen={bankSupplierModalVisible} toggle={() => setBankSupplierModalVisible(false)} size="xl">
        <ModalHeader toggle={() => setBankSupplierModalVisible(false)}>
          Suppliers for Bank: {selectedBankData.bankName}
        </ModalHeader>
        <ModalBody>
          <Table className="table table-bordered">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Supplier / Applicant Name</th>
                <th>IDR</th>
                <th>SGD</th>
                <th>USD</th>
                <th>MYR</th>
                <th>CNY</th>
              </tr>
            </thead>
            <tbody>
              {selectedBankData.suppliers.map((supplier, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>
                    <span
                      className="linkcolor"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSupplierClick(supplier)}
                    >
                      {supplier.name || "(No Name)"}
                    </span>
                  </td>
                  {["IDR", "SGD", "USD", "MYR", "CNY"].map(curr => (
                    <td key={curr} style={{ textAlign: "right" }}>
                      {(supplier.totals[curr] || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-danger" onClick={() => setBankSupplierModalVisible(false)}>
            <i className="bx bx-x-circle me-2"></i>Close
          </button>
        </ModalFooter>
      </Modal>

      {/* Claim List Modal - Shows claims for selected supplier */}
      <Modal isOpen={claimListModalVisible} toggle={() => setClaimListModalVisible(false)} size="xl">
        <ModalHeader toggle={() => setClaimListModalVisible(false)}>
          Claims List
        </ModalHeader>
        <ModalBody>
          <DataTable value={selectedSupplierClaims} paginator rows={10}>
            <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
            <Column field="claimno" header="Claim No"
              body={(row) => (
                <span
                  className="linkcolor"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleClaimClick(row)}
                >
                  {row.claimno || row.ClaimNo || "-"}
                </span>
              )}
            />
            <Column field="ClaimCategory" header="Category" />
            <Column field="PaymentMethod" header="Payment Method" />
            <Column field="curr" header="Currency" />
            <Column field="amount" header="Amount"
              body={(row) => parseFloat(row.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              style={{ textAlign: "right" }}
            />
          </DataTable>
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-secondary" onClick={() => {
            setClaimListModalVisible(false);
          }}>
            <i className="bx bx-arrow-back me-2"></i>Back to Suppliers
          </button>
          <button type="button" className="btn btn-danger" onClick={() => {
            setClaimListModalVisible(false);
            setBankSupplierModalVisible(false);
          }}>
            <i className="bx bx-x-circle me-2"></i>Close All
          </button>
        </ModalFooter>
      </Modal>
    </>
  );

  //   <Modal isOpen={showSupplierModal} toggle={toggleSupplierModal} size="xl">
  //   <ModalHeader toggle={toggleSupplierModal}>Voucher</ModalHeader>
  //   <ModalBody>

  //     {selectedVoucherId && (
  //       <PaymentVoucher VoucherId={selectedVoucherId} />
  //     )}
  //   </ModalBody>
  // </Modal>
};

export default PaymentSummaryTable;