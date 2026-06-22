import React, { useState, useEffect } from "react";
import { Card, Col, Container, Row, Label, Button, FormGroup, InputGroup, UncontrolledAlert, Input } from "reactstrap";
import { useHistory } from "react-router-dom";
import { Modal, ModalHeader, ModalBody, ModalFooter, Table } from "reactstrap";
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import Select from "react-select";
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Tag } from 'primereact/tag';
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "flatpickr/dist/themes/material_blue.css";
import Flatpickr from "react-flatpickr";
import { Tooltip } from "primereact/tooltip";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useRef } from "react";
import {
    GetDiscussionlist, UpdateDiscussion, ClaimAndPaymentGetById, GetByIdPurchaseRequisition,
    DownloadFileById, GetPRNoBySupplierAndCurrency, GetByIdPurchaseOrder
} from "common/data/mastersapi";
import Swal from 'sweetalert2';
import Breadcrumbs from "../../components/Common/Breadcrumb";
import useAccess from "../../common/access/useAccess";

const getUserDetails = () => {
    if (localStorage.getItem("authUser")) {
        const obj = JSON.parse(localStorage.getItem("authUser"))
        return obj;
    }
}

const DiscussionList = () => {

    const { access, applyAccessUI } = useAccess("Claim", "Approval Discussions");

    useEffect(() => {
        if (!access.loading) {
            applyAccessUI();
        }
    }, [access, applyAccessUI]);

    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState({});
    const [previewUrl, setPreviewUrl] = useState("");
    const [fileName, setFileName] = useState("");

    const history = useHistory();
    const printRef = useRef();
    const [datadiscussionlist, setdatadiscussionlist] = useState([]);
    const [filters, setFilters] = useState(null);

    const [loading, setLoading] = useState(false);
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [errormsg, setErrormsg] = useState();



    const [prDetailVisible, setPrDetailVisible] = useState(false);
    const [selectedPRDetail, setSelectedPRDetail] = useState(null);
    const formatDatePR = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).replace(/ /g, "-"); // e.g. "29-Aug-2025"
    };


    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const [branchId, setBranchId] = useState(1);
    const [orgId, setOrgId] = useState(1);
    const [UserData, setUserData] = useState(null);

    const [acceptModalOpen, setAcceptModalOpen] = useState(false);
    const [remarks, setRemarks] = useState("");
    const [selectedRow, setSelectedRow] = useState(null);
    const [POdetailVisible, setPODetailVisible] = useState(false);
    const [selectedPODetail, setSelectedPODetail] = useState({});
    const formatpoDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).replace(/ /g, "-"); // e.g. "29-Aug-2025"
    };


    const handleViewRemarks = async (claimId) => {
        try {
            const res = await Getclaimremarksdetails(claimId);
            if (res?.status) {
                setRemarksData(res.data);
                setSelectedClaimId(claimId);
                setRemarkModalOpen(true);
            } else {
                Swal.fire("Error", "No remarks found for this claim.", "error");
            }
        } catch (err) {
            console.error("Failed to load remarks:", err);
            Swal.fire("Error", "Failed to fetch remarks.", "error");
        }
    };

    const handleAcceptClick = (rowData) => {
        setSelectedRow(rowData);
        setRemarks(""); // clear remarks each time
        setAcceptModalOpen(true);
    };

    const handleAcceptSave = async () => {
        if (!remarks.trim()) {
            Swal.fire("Validation", "Please enter remarks before saving.", "warning");
            return;
        }

        try {
            const payload = {
                claimId: selectedRow.paymentplanid,
                remarks: remarks,
                updatedBy: UserData?.u_id || 0
            };

            const res = await UpdateDiscussion(selectedRow.paymentplanid, "Clarified : " + remarks, selectedRow.isclaim, selectedRow.type, UserData?.u_id || 0, selectedRow.logid || 0);
            if (res?.status) {
                Swal.fire("Success", "Discussion updated successfully.", "success");
                setAcceptModalOpen(false);
                searchData(); // reload table
            } else {
                Swal.fire("Error", res?.message || "Failed to update discussion.", "error");
            }
        } catch (err) {
            Swal.fire("Error", "Something went wrong.", "error");
        }
    };
    const actionBodyTemplate = (rowData) => {
        return (
            <Button style={{ fontSize: "smaller" }}
                className="btn btn-success btn-sm"
                onClick={() => handleAcceptClick(rowData)}
            >
                Accept
            </Button>
        );
    };

    useEffect(() => {

        const userData = getUserDetails();
        setUserData(userData);
        console.log("Login data : ", UserData?.u_id);

        const fetchDefaultClaimAndPayment = async () => {
            debugger;
            const userData = getUserDetails();
            const res = await GetDiscussionlist(orgId, branchId, userData?.u_id);
            if (res.status) {
                setdatadiscussionlist(res.data)
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Initial Load Failed',
                    text: res.message || 'Unable to fetch default claim and payment data.',
                });
            }
        };

        fetchDefaultClaimAndPayment();
    }, []);




    const handlePRClick = async (prid) => {
        if (!prid || prid <= 0) {
            Swal.fire("Invalid", "No valid PR found", "warning");
            return;
        }

        try {
            const res = await GetByIdPurchaseRequisition(prid, 1, 1);

            if (res?.status && res.data) {
                let details = res.data.Details || [];
                details = details.map((d) => ({
                    ...d,
                    memo_number: d.PM_Number || "NA",
                    MemoDisplay: d.PM_Number || "NA",
                }));

                const headerMemoNumbers = [...new Set(details.map(d => d.PM_Number).filter(Boolean))].join(", ") || "NA";

                setSelectedPRDetail({
                    ...res.data,
                    Header: {
                        ...res.data.Header,
                        MemoConcat: headerMemoNumbers,
                        ProjectName: 'N/A',
                    },
                    Details: details,
                });
                setPrDetailVisible(true);
            } else {
                Swal.fire("Not Found", `PR details not available (ID: ${prid})`, "warning");
            }
        } catch (err) {
            console.error("Error loading PR:", err);
            Swal.fire("Error", "Failed to load PR details", "error");
        }
    };
    const handleShowPODetails = async (row) => {
        const res = await GetByIdPurchaseOrder(row.poid, 1, 1);
        const supplier_id = res?.data?.Header?.supplierid;
        const currency_id = res?.data?.Header?.currencyid;
        // const prList = await GetCommonProcurementPRNoList(supplier_id,orgId,branchId);
        const prList = await GetPRNoBySupplierAndCurrency(supplier_id, currency_id, 1, 1);
        if (res.status) {
            let requisition = res.data.Requisition || [];

            if (prList?.data?.length > 0) {
                requisition = requisition.map((r) => {
                    const pr = prList?.data?.find((p) => p.prid === r.prid);
                    return {
                        ...r,
                        PR_NUMBER: pr ? pr.pr_number : "NA",
                        PRDisplay: pr ? pr.pr_number : "NA",
                    };
                });
            } else {
                requisition = requisition.map((r) => ({
                    ...r,
                    PR_NUMBER: "NA",
                    PRDisplay: "NA",
                }));
            }

            // Collect unique PR numbers for header concat
            let headerPRNumbers = [
                ...new Set(requisition.map((r) => r.prnumber).filter(Boolean)),
            ].join(", ");

            // Extract PR IDs in same order (for clicking)
            const prIdsInOrder = requisition
                .map(r => r.prid)
                .filter(id => id > 0);

            if (!headerPRNumbers) headerPRNumbers = "NA";

            setSelectedPODetail({
                ...res.data,
                Header: {
                    ...res.data.Header,
                    PRConcat: headerPRNumbers, // header field with PR numbers
                    PRIdsList: prIdsInOrder,
                },
                Details: requisition, // requisition rows are the detail lines
            });

            setPODetailVisible(true);

            // if you later add attachments for PO
            // setPreviewUrl(res.data.Header.filepath || "");
            // setFileName(res.data.Header.filename || "");
        } else {
            Swal.fire("Error", "Data is not available", "error");
        }
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
    const actionpoBodyTemplate = (rowData) => {
        return <span style={{ cursor: "pointer", color: "blue" }} className="btn-rounded btn btn-link"
            onClick={() => handleShowPODetails(rowData)}>{rowData.pono}</span>;
    };

    const handleShowPODetails1 = async (row) => {
        const res = await GetByIdPurchaseOrder(row.poid, orgId, branchId);
        const supplier_id = res?.data?.Header?.supplierid;
        const currency_id = res?.data?.Header?.currencyid;
        // const prList = await GetCommonProcurementPRNoList(supplier_id,orgId,branchId);
        const prList = await GetPRNoBySupplierAndCurrency(supplier_id, currency_id, orgId, branchId);
        if (res.status) {
            let requisition = res.data.Requisition || [];

            if (prList?.data?.length > 0) {
                requisition = requisition.map((r) => {
                    const pr = prList?.data?.find((p) => p.prid === r.prid);
                    return {
                        ...r,
                        PR_NUMBER: pr ? pr.pr_number : "NA",
                        PRDisplay: pr ? pr.pr_number : "NA",
                    };
                });
            } else {
                requisition = requisition.map((r) => ({
                    ...r,
                    PR_NUMBER: "NA",
                    PRDisplay: "NA",
                }));
            }

            // Collect unique PR numbers for header concat
            let headerPRNumbers = [
                ...new Set(requisition.map((r) => r.prnumber).filter(Boolean)),
            ].join(", ");

            if (!headerPRNumbers) headerPRNumbers = "NA";

            setSelectedPODetail({
                ...res.data,
                Header: {
                    ...res.data.Header,
                    PRConcat: headerPRNumbers, // header field with PR numbers
                },
                Details: requisition, // requisition rows are the detail lines
            });

            setPODetailVisible(true);

            // if you later add attachments for PO
            // setPreviewUrl(res.data.Header.filepath || "");
            // setFileName(res.data.Header.filename || "");
        } else {
            Swal.fire("Error", "Data is not available", "error");
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
          <th colspan="3">Claim</th>
          <th colspan="2">PPP</th>
          <th colspan="2">Vouchers</th>
        </tr>
        <tr>
         <th>HOD</th> <th>GM</th><th>Director</th>
          <th>GM</th><th>Director</th>
          <th>Director</th><th>CEO</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          ${[
                detail.header?.ClmhodStatus,
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



    const clearFilter = () => {
        initFilters();
    };

    const onGlobalFilterChange = (e) => {
        const value = e.target.value;
        setGlobalFilterValue(value);
        setFilters((prevFilters) => ({
            ...prevFilters,
            global: { value, matchMode: FilterMatchMode.CONTAINS }
        }));
    };



    const initFilters = () => {
        setFilters({
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            Approvallevel: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
            levelapprover: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
            claim_comment: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
            refno: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },

        });
        setGlobalFilterValue('');
    };

    const renderHeader = () => {
        return (
            <div className="row align-items-center g-3 clear-spa">
                <div className="col-12 col-lg-6">
                    <Button className="btn btn-danger btn-label" onClick={clearFilter} >
                        <i className="mdi mdi-filter-off label-icon" /> Clear
                    </Button>
                </div>

                <div className="col-12 col-lg-3">
                    <input className="form-control" type="text" value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
                </div>
            </div>
        );
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


    const statusItemTemplate = (option) => {
        return <Tag value={option.label} severity={getSeverity(option.value)} />;
    };



    const handleShowDetails = async (row) => {
        const res = await ClaimAndPaymentGetById(row.paymentplanid, 1, 1);
        if (res.status) {

            setSelectedDetail(res.data);
            setDetailVisible(true);

            setPreviewUrl(res.data?.header?.AttachmentPath || "");
            setFileName(res.data?.header?.AttachmentName || "");

        }
        else {
            Swal.fire("Error", "Data is not available", "error");

        }
    }
    const actionclaimBodyTemplate = (rowData) => {
        const disabled = !access.canViewDetails;
        if (rowData.isclaim === 1) {
            return (
                <span
                    style={{
                        cursor: disabled ? "not-allowed" : "pointer",
                        color: disabled ? "gray" : "blue",
                        opacity: disabled ? 0.6 : 1
                    }}
                    className="btn-rounded btn btn-link"
                    data-access="viewdetails"
                    onClick={() => {
                        if (!disabled) handleShowDetails(rowData);
                    }}
                >
                    {rowData.refno}
                </span>
            );
        } else {
            return (
                <span
                    style={{
                        cursor: disabled ? "not-allowed" : "pointer",
                        color: disabled ? "gray" : "blue",
                        opacity: disabled ? 0.6 : 1
                    }}
                    className="btn-rounded btn btn-link"
                    data-access="viewdetails"
                >
                    {rowData.refno}
                </span>
            );
        }

    };

    const actionpurposeBodyTemplate = (rowData) => {
        return (
            <div>
                <Tooltip target=".purpose-icon" />

                <i className="fas fa-eye purpose-icon"
                    data-pr-tooltip={rowData.purpose}
                    data-pr-position="right"
                    data-pr-at="right+5 top"
                    data-pr-my="left center-2"
                    style={{ fontSize: '1.5rem', cursor: 'pointer' }}>

                </i>
            </div>
        )


    };

    const actionAckBodyTemplate = (rowData) => {
        return (
            <span
            >{rowData.voucherno}</span>
            //    onClick={() => handleVoucherClick(rowData.voucherid)}


        );
    }; const handleDeleteConfirm = (row) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'Do you want to delete this claim?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
        }).then((result) => {
            if (result.isConfirmed) {
                deleteClaim(row);
            }
        });
    };

    const deleteClaim = async (row) => {
        try {
            const payload = {
                delete: {
                    inActiveBy: UserData?.u_id || 0,        // Replace with your actual user ID
                    inActiveIP: '127.0.0.1',        // Replace with actual IP if required
                    claimId: row.Claim_ID
                }
            };

            const response = await DeleteClaimAndPayment(payload); // Make sure this API is imported

            if (response?.status) {
                Swal.fire('Deleted!', 'Claim has been deleted.', 'success');
                searchData(); // Reload the table after delete
            } else {
                Swal.fire('Error', 'Failed to delete the claim.', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'An error occurred during deletion.', 'error');
        }
    };




    const RemarksBodyTemplate = (rowData) => {
        return (
            <div className="actions" style={{ alignItems: 'center', gap: '0.5rem' }}>


                {/* View Remarks Button */}
                <span onClick={() => handleViewRemarks(rowData.Claim_ID)} title="View History" style={{ cursor: 'pointer' }}>
                    <i className="mdi mdi-comment-text-outline" style={{ fontSize: '1.5rem', color: '#17a2b8' }}></i>
                </span>


            </div>
        );
    };



    const header = renderHeader();
    const editRow = (rowData) => {
        // console.log('Edit row:', rowData);
        history.push(`/edit-claim&payment/${rowData.Claim_ID}`);
    };
    const CopyClaim = (rowData) => {
        // console.log('Edit row:', rowData);
        history.push(`/copy-claim&payment/${rowData.Claim_ID}`);
    };

    const fetchAlldiscussion = async () => {
        debugger;
        const userData = getUserDetails();
        const res = await GetDiscussionlist(orgId, branchId, userData?.u_id);

        if (res.status) {
            setdatadiscussionlist(res.data);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Failed to Fetch Data',
                text: res.message || 'Something went wrong. Please try again.',
            });
        }
    };

    const searchData = async () => {

        await fetchAlldiscussion();
    };

    const cancelFilter = async () => {

        await fetchAlldiscussion(0, 0);
    };

    const exportToExcel = () => {
        // const filteredQuotes = salesOrder.map(({ IsPosted, ...rest }) => rest);
        const exportData = datadiscussionlist.map((item) => ({
            "Ref #.": item.refno ?? '',
            "Approval Level": item.Approvallevel ?? '',
            "Approver": item.levelapprover ?? '',

            "Discussion Comment": item.claim_comment ?? '',

        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Returns");

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const now = new Date();
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const day = String(now.getDate()).padStart(2, "0");
        const month = months[now.getMonth()];
        const year = now.getFullYear();

        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const ampm = hours >= 12 ? "pm" : "am";
        hours = hours % 12 || 12;

        const timeStr = `${hours}:${minutes}${ampm}`;
        const fileName = `BTG-Approval-Discussion-${day}${month}${year}-${timeStr}.xlsx`;

        saveAs(data, fileName);
    };

    if (!access.loading && !access.canView) {
        return (
            <div style={{ background: "white", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <h3>You do not have permission to view this page.</h3>
            </div>
        );
    }




    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <Breadcrumbs title="Finance" breadcrumbItem=" Approval Discussion" />
                    <Row>
                        <Col lg="12">
                            <Card className="search-top">
                                <div className="row align-items-end g-1 quotation-mid">





                                    <div className={`col-12 col-lg-12 d-flex justify-content-end flex-wrap gap-2`} >
                                        <button type="button" className="btn btn-danger" onClick={cancelFilter}><i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>Cancel</button>
                                        <button type="button" className="btn btn-secondary" onClick={exportToExcel}> <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Export</button>



                                    </div>
                                </div>
                            </Card>
                        </Col>
                        <Col lg="12">
                            <Card >

                                <DataTable value={datadiscussionlist} paginator showGridlines rows={access.records || 10} loading={loading}
                                    filters={filters} globalFilterFields={['refno', 'Approvallevel', 'levelapprover', 'claim_comment']} header={header}
                                    emptyMessage="No records found." onFilter={(e) => setFilters(e.filters)} className='blue-bg'   >
                                    <Column field="refno" sortable body={actionclaimBodyTemplate} header="Ref #" filter className="text-left" filterPlaceholder="Search by ref no" />
                                    <Column field="Approvallevel" sortable header="Approval Level" filter className="text-left" filterPlaceholder="Search by level" />
                                    <Column field="levelapprover" sortable filter header="Approver" className="text-left" />

                                    <Column field="claim_comment" sortable header="Discussion Comment" filter filterPlaceholder="Search by Comment" style={{ width: '155px' }} className="text-left" />



                                    <Column header="Accept" showFilterMatchModes={false} body={actionBodyTemplate} className="text-center" />


                                </DataTable>
                                {/* <div ref={printRef} style={{ display: 'none' }} id="printableArea">
                                    <h4>Sales Order List</h4>
                                    <table border="1" cellPadding="8" cellSpacing="0" width="100%">
                                        <thead>

                                            <tr>
                                                <th>System Seq. No.</th>
                                                <th>SO Date</th>
                                                <th>Customer Name</th>
                                                <th>Gas Code</th>
                                                <th>Gas Description</th>
                                                <th>Qty</th>
                                                <th>Delivery Address</th>
                                                <th>Delivery Instruction</th>
                                                <th>Delivery Req Date</th>
                                                <th>Ordered By</th>
                                                <th>PO No.</th>
                                                <th>SQ No.</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {discussionlist && discussionlist.map((order, idx) => (
                                                <tr key={idx}>
                                                    <td>{order.SO_Number}</td>
                                                    <td>{order.SO_Date}</td>
                                                    <td>{order.customername}</td>
                                                    <td>{order.GasCode}</td>
                                                    <td>{order.GasDescription}</td>
                                                    <td className="text-end">{order.qty}</td>
                                                    <td>{order.DeliveryAddress}</td>
                                                    <td>{order.DeliveryInstruction}</td>
                                                    <td>{order.DeliveryReqDate}</td>
                                                    <td>{order.OrderBy}</td>
                                                    <td>{order.POnumber}</td>
                                                    <td>{order.SQ_No}</td>
                                                    <td>{order.Status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div> */}
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            <Modal isOpen={acceptModalOpen} toggle={() => setAcceptModalOpen(false)}>
                <ModalHeader toggle={() => setAcceptModalOpen(false)}>
                    Accept Discussion
                </ModalHeader>
                <ModalBody>
                    <FormGroup>
                        <Label for="remarks">Remarks</Label>

                        <Input
                            type="textarea"
                            id="remarks"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            rows="4"
                            placeholder="Enter your remarks"
                        />
                        <span style={{ color: "green" }}>Clarified</span>
                    </FormGroup>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setAcceptModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button color="primary" data-access="save" onClick={handleAcceptSave}>
                        Save
                    </Button>
                </ModalFooter>
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
                                    })}</span>]
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
                                {(selectedDetail.header?.ClaimCategoryId === 3) && (

                                    <Column
                                        field="pono"
                                        header="PO No"

                                        className="text-left"
                                        style={{ width: "10%" }}
                                        body={actionpoBodyTemplate}
                                    />
                                )}

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
                                                <th style={{ padding: "0px", width: "18%", backgroundColor: "#B4DBE0" }} className="text-center" colSpan="3">Claim</th>
                                                <th style={{ padding: "0px", width: "12%", backgroundColor: "#E6E4BC" }} className="text-center" colSpan="2">PPP</th>
                                                <th style={{ padding: "0px", width: "10%", backgroundColor: "#FFE9F5" }} className="text-center" colSpan="2">Vouchers</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <th style={{ padding: "0px", backgroundColor: "#B4DBE0" }} className="text-center">HOD</th>
                                                <th style={{ padding: "0px", backgroundColor: "#B4DBE0" }} className="text-center">GM</th>
                                                <th style={{ padding: "0px", backgroundColor: "#B4DBE0" }} className="text-center">Director</th>
                                                <th style={{ padding: "0px", backgroundColor: "#E6E4BC" }} className="text-center">GM</th>
                                                <th style={{ padding: "0px", backgroundColor: "#E6E4BC" }} className="text-center">Director</th>
                                                <th style={{ padding: "0px", backgroundColor: "#FFE9F5" }} className="text-center">Director</th>
                                                <th style={{ padding: "0px", backgroundColor: "#FFE9F5" }} className="text-center">CEO</th>

                                            </tr>
                                            <tr>
                                                <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.ClmhodStatus)}`} /></td>

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
                    <button
                        type="button"
                        data-access="print"
                        className="btn btn-primary"
                        onClick={() => handleDetailsPrint()}
                    >
                        <i className="mdi mdi-printer font-size-16 me-2"></i> Print
                    </button>

                    <button type="button" className="btn btn-danger" onClick={() => setDetailVisible(false)}> <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Close</button>

                </ModalFooter>
            </Modal>

            <Modal isOpen={POdetailVisible} toggle={() => setPODetailVisible(false)} size="xl">
                <ModalHeader toggle={() => setPODetailVisible(false)}>Purchase Order Details</ModalHeader>
                <ModalBody>
                    {selectedPODetail && (
                        <>
                            {/* PO Header Section */}
                            <Row form>
                                {[
                                    ["PO No.", selectedPODetail.Header?.pono],
                                    ["PO Date", formatpoDate(selectedPODetail.Header?.podate)],
                                    ["Supplier", selectedPODetail.Header?.suppliername],
                                    ["Currency", selectedPODetail.Header?.currencycode],
                                    ["PR No.", selectedPODetail.Header?.PRConcat], // concat of all PRs
                                ].map(([label, val], i) => (
                                    // <Col md="4" key={i} className="form-group row ">
                                    //     <Label className="col-sm-5 col-form-label bold">{label}</Label>
                                    //     <Col sm="7" className="mt-2">: {val}</Col>
                                    // </Col>


                                    <Col md="4" key={i} className="form-group row">
                                        <Label className="col-sm-5 col-form-label bold">{label}</Label>
                                        <Col sm="7" className="mt-2">
                                            :{" "}
                                            {label === "PR No." ? (
                                                (() => {
                                                    // Safely get the values
                                                    const prConcat = selectedPODetail.Header?.PRConcat || "";
                                                    const prIdsList = selectedPODetail.Header?.PRIdsList || [];

                                                    if (!prConcat || prConcat === "NA" || prConcat.trim() === "") {
                                                        return "N/A";
                                                    }

                                                    const prNumbers = prConcat.split(","); // Safe now

                                                    return (
                                                        <span>
                                                            {prNumbers.map((prNumber, index) => {
                                                                const cleanPR = prNumber.trim();
                                                                if (!cleanPR) return null;

                                                                const prid = prIdsList[index];
                                                                const isLast = index === prNumbers.length - 1;

                                                                return (
                                                                    <span key={index}>
                                                                        {prid ? (
                                                                            <a
                                                                                href="#"
                                                                                style={{
                                                                                    color: "#007bff",
                                                                                    textDecoration: "underline",
                                                                                    cursor: "pointer",
                                                                                }}
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    handlePRClick(prid); // Opens correct PR
                                                                                }}
                                                                                title={`View ${cleanPR}`}
                                                                            >
                                                                                {cleanPR}
                                                                            </a>
                                                                        ) : (
                                                                            <span style={{ color: "#666" }}>{cleanPR}</span>
                                                                        )}
                                                                        {!isLast && ", "}
                                                                    </span>
                                                                );
                                                            })}
                                                        </span>
                                                    );
                                                })()
                                            ) : (
                                                val || "N/A"
                                            )}
                                        </Col>
                                    </Col>
                                ))}
                            </Row>

                            <hr />

                            <DataTable value={selectedPODetail.Requisition}>
                                <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                                <Column field="prnumber" header="PR No." />
                                <Column field="groupname" header="Item Group" />
                                <Column field="itemname" header="Item Name" />


                                <Column
                                    field="qty"
                                    header="Qty"
                                    body={(rowData) =>
                                        rowData.qty?.toLocaleString("en-US", { minimumFractionDigits: 3 })
                                    }

                                />
                                <Column field="uom" header="UOM" />
                                <Column
                                    field="unitprice"
                                    header="Unit Price"
                                    body={(rowData) =>
                                        rowData.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={selectedPODetail.Header?.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />

                                <Column
                                    field="discountvalue"
                                    header="Discount"
                                    body={(rowData) =>
                                        rowData.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={selectedPODetail.Header?.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />

                                <Column field="taxperc" header="Tax %" />

                                <Column
                                    field="taxvalue"
                                    header="Tax Amt"
                                    body={(rowData) =>
                                        rowData.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={selectedPODetail.Header?.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />

                                <Column field="vatperc" header="VAT %" />

                                <Column
                                    field="vatvalue"
                                    header="VAT Amt"
                                    body={(rowData) =>
                                        rowData.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={selectedPODetail.Header?.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />

                                <Column
                                    field="nettotal"
                                    header="Total Amt"
                                    body={(rowData) =>
                                        rowData.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={<b>{selectedPODetail.Header?.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</b>}
                                />
                            </DataTable>

                        </>
                    )}
                </ModalBody>

                <ModalFooter>
                    <button type="button" className="btn btn-danger" onClick={() => setPODetailVisible(false)}>
                        <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Close
                    </button>
                </ModalFooter>
            </Modal>

        </React.Fragment>
    )
}
export default DiscussionList