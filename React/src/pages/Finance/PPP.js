import {
  Col,

  Row,
  Label, Input, InputGroup
} from "reactstrap";
import PaymentVoucher from "./PaymentVoucher";
import PaymentSummaryTable from './PaymentSummaryTable';
import PaymentHistory from "../Procurement/Invoice-Receipt/procurements-irn-payment-history";
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import Breadcrumbs from "../../components/Common/Breadcrumb"
import { Dialog } from 'primereact/dialog';
import { Calendar } from 'primereact/calendar';
import { Tag } from "primereact/tag";
import React, { useState, useRef, useEffect } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Table } from 'reactstrap';
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "flatpickr/dist/themes/material_blue.css";
import Flatpickr from "react-flatpickr";
import { Container, Card } from "reactstrap";
import { Accordion, AccordionTab } from "primereact/accordion"; // Accordion tabs :contentReference[oaicite:4]{index=4}
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Tooltip } from "primereact/tooltip";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { Badge } from 'primereact/badge';
import { Checkbox } from 'primereact/checkbox';
import { RadioButton } from 'primereact/radiobutton';
import Select from 'react-select';
import Swal from 'sweetalert2';
import { ColumnGroup } from 'primereact/columngroup';
import useAccess from "../../common/access/useAccess";
import {
  ClaimAndPaymentGetById, DownloadFileById, SavePaymentPlan,
  GetPRNoBySupplierAndCurrency, GetByIdPurchaseOrder, GetPaymentMethods, GetBankList, GetByIdPurchaseRequisition, GetPaymentVoucher
} from "common/data/mastersapi";
import { GetPaymentPalnAccordianDetails, SaveVoucherAPI } from "common/data/pppapi";
import { toWords } from 'number-to-words';
import axios from "axios";
import { PYTHON_API_URL } from "common/pyapiconfig";
const PPP = ({ selectedType, setSelectedType }) => {

  const types = [
    "Claim Approval",
    "Payment Plan",
    "PPP",
    "PPP Approval"
  ];

  const { access, applyAccessUI } = useAccess("Claim", "PPP");

  useEffect(() => {
    if (!access.loading) {
      applyAccessUI();
    }
  }, [access, applyAccessUI]);

  const [POdetailVisible, setPODetailVisible] = useState(false);
  const [selectedPODetail, setSelectedPODetail] = useState({});
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyRange, setHistoryRange] = useState({ from: null, to: null });
  const [historyForType, setHistoryForType] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState({});

  const UserData = JSON.parse(localStorage.getItem("authUser")) || {};
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [selectedpoids, setselectedpoids] = useState([]);

  const togglePaymentHistoryModal = () => setShowPaymentHistoryModal(!showPaymentHistoryModal);
  const handleOpenPaymentHistory = () => {
    const sid = selectedDetail?.header?.supplierid ?? selectedDetail?.header?.SupplierId ?? selectedDetail?.header?.supplierId ?? 0;
    let poNo = selectedDetail?.header?.PONo;
    if (!poNo || poNo === "N/A") {
      const detailWithPO = selectedDetail?.details?.find(d => d.pono && d.pono !== "N/A");
      if (detailWithPO) {
        poNo = detailWithPO.pono;
      }
    }
    if (!sid || sid === 0) {
      Swal.fire("Info", "No supplier information available for payment history.", "info");
      return;
    }
    if (poNo && (!selectedDetail.header.PONo || selectedDetail.header.PONo === "N/A")) {
      selectedDetail.header.PONo = poNo;
    }
    setShowPaymentHistoryModal(true);
  };

  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedsummaryRows, setselectedsummaryRows] = useState([]);
  const [Seqno, setSeqno] = useState("");
  const [claims, setclaims] = useState([
    // { modeOfPayment: "", bank: "", paymentDate: null, isSelected: false, approvedone: 1, discussedone: 0, approvedtwo: 1, discussedtwo: 0, comment: "", type: "CLAIM", id: 1, claimno: "CLM0000025", date: "23‑Jun‑25", name: "Sandy", dept: "Sales & Marketing", amount: "100.00", curr: "SGD", transactions: "Txn A" },
    // { modeOfPayment: "", bank: "", paymentDate: null, isSelected: false, approvedone: 1, discussedone: 0, approvedtwo: 1, discussedtwo: 0, comment: "", type: "CLAIM", id: 2, claimno: "CLM0000171", date: "26‑Jun‑25", name: "Lysa", dept: "Sales & Marketing", amount: "236.00", curr: "USD", transactions: "Txn B" },
    // { modeOfPayment: "", bank: "", paymentDate: null, isSelected: false, approvedone: 1, discussedone: 0, approvedtwo: 1, discussedtwo: 0, comment: "", type: "CASH ADVANCE", id: 3, claimno: "CLM0000036", date: "26‑Jun‑25", name: "Mery", dept: "Finance", amount: "122.00", curr: "IDR", transactions: "Txn C" },
    // { modeOfPayment: "", bank: "", paymentDate: null, isSelected: false, approvedone: 1, discussedone: 0, approvedtwo: 1, discussedtwo: 0, comment: "", type: "CASH ADVANCE", id: 4, claimno: "CLM0000057", date: "26‑Jun‑25", name: "Anwar", dept: "Operations", amount: "33.30", curr: "SGD", transactions: "Txn D" },
    // { modeOfPayment: "", bank: "", paymentDate: null, isSelected: false, approvedone: 1, discussedone: 0, approvedtwo: 1, discussedtwo: 0, comment: "", type: "SUPPLIER PAYMENT", id: 5, claimno: "CLM0000122", date: "25‑Jun‑25", name: "Shafiq", dept: "HR", amount: "376.80", curr: "MYR", transactions: "Txn E" },
    // { modeOfPayment: "", bank: "", paymentDate: null, isSelected: false, approvedone: 1, discussedone: 0, approvedtwo: 1, discussedtwo: 0, comment: "", type: "SUPPLIER PAYMENT", id: 6, claimno: "CLM0000132", date: "26‑Jun‑25", name: "Sandy", dept: "Sales & Marketing", amount: "433.00", curr: "IDR", transactions: "Txn F" },
    // { isSelected:false,approvedone:1,discussedone:0,approvedtwo:1,discussedtwo:0,comment:"",type: "PPV",id:5, claimno: "CLM0000122", date: "25‑Jun‑25", name: "Shafiq", dept: "HR", amount: "376.80", curr: "MYR", transactions: "Txn E" },
    // { isSelected:false,approvedone:1,discussedone:0,approvedtwo:1,discussedtwo:0,comment:"",type: "PPV",id:6, claimno:"CLM0000132", date: "26‑Jun‑25", name: "Sandy", dept: "Sales & Marketing", amount: "433.00", curr: "IDR", transactions: "Txn F" },
    // { isSelected:false,approvedone:1,discussedone:0,approvedtwo:1,discussedtwo:0,comment:"",type: "PPV PV",id:5, claimno: "CLM0000122", date: "25‑Jun‑25", name: "Shafiq", dept: "HR", amount: "376.80", curr: "MYR", transactions: "Txn E" },
    // { isSelected:false,approvedone:1,discussedone:0,approvedtwo:1,discussedtwo:0,comment:"",type: "PPV PV",id:6, claimno:"CLM0000132", date: "26‑Jun‑25", name: "Sandy", dept: "Sales & Marketing", amount: "433.00", curr: "IDR", transactions: "Txn F" }
  ]);
  const [historyArray, sethistoryArray] = useState([
    { transactiondate: "26-Jun-25", approvedone: 1, discussedone: 0, approvedtwo: 1, discussedtwo: 0, comment: "", type: "CLAIM", id: 1, claimno: "CLM0000025", date: "23‑Jun‑25", name: "Sandy", dept: "Sales & Marketing", amount: "100.00", curr: "SGD", transactions: "Txn A" },
    { transactiondate: "26-Jun-25", approvedone: 1, discussedone: 0, approvedtwo: 0, discussedtwo: 0, comment: "", type: "CLAIM", id: 2, claimno: "CLM0000171", date: "26‑Jun‑25", name: "Lysa", dept: "Sales & Marketing", amount: "236.00", curr: "USD", transactions: "Txn B" },
    { transactiondate: "26-Jun-25", approvedone: 1, discussedone: 0, approvedtwo: 0, discussedtwo: 0, comment: "", type: "CASH ADVANCE", id: 3, claimno: "CLM0000036", date: "26‑Jun‑25", name: "Mery", dept: "Finance", amount: "122.00", curr: "IDR", transactions: "Txn C" },
    { transactiondate: "26-Jun-25", approvedone: 0, discussedone: 1, approvedtwo: 0, discussedtwo: 0, comment: "", type: "CASH ADVANCE", id: 4, claimno: "CLM0000057", date: "26‑Jun‑25", name: "Anwar", dept: "Operations", amount: "33.30", curr: "SGD", transactions: "Txn D" },
    { transactiondate: "26-Jun-25", approvedone: 0, discussedone: 1, approvedtwo: 0, discussedtwo: 1, comment: "", type: "SUPPLIER PAYMENT", id: 5, claimno: "CLM0000122", date: "25‑Jun‑25", name: "Shafiq", dept: "HR", amount: "376.80", curr: "MYR", transactions: "Txn E" },
    { transactiondate: "26-Jun-25", approvedone: 0, discussedone: 1, approvedtwo: 1, discussedtwo: 0, comment: "", type: "SUPPLIER PAYMENT", id: 6, claimno: "CLM0000132", date: "26‑Jun‑25", name: "Sandy", dept: "Sales & Marketing", amount: "433.00", curr: "IDR", transactions: "Txn F" }
  ]);



  const [showModal, setShowModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [action1, setAction1] = useState({});
  const [action2, setAction2] = useState({});
  const handleDiscuss = (rowData) => {
    setSelectedClaim(rowData);
    setShowModal(true);
  };
  const formatpoDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(/ /g, "-"); // e.g. "29-Aug-2025"
  };
  const formatDatePR = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(/ /g, "-"); // e.g. "29-Aug-2025"
  };

  const [prDetailVisible, setPrDetailVisible] = useState(false);
  const [selectedPRDetail, setSelectedPRDetail] = useState(null);


  function formatDateToDateOnly(datetime) {
    if (!datetime) return null;
    const date = new Date(datetime);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  const [showvoucherModal, setShowvoucherModal] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState(null);
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [modeOfPaymentOptions, setModeOfPaymentOptions] = useState([]);
  const [bankOptions, setBankOptions] = useState([]);

  useEffect(() => {
    const loadPaymentMethodList = async () => {
      const data = await GetPaymentMethods(1, 0);
      const options = data.map(item => ({
        value: item.PaymentMethodId,
        label: item.PaymentMethod
      }));
      setModeOfPaymentOptions(options);
    };

    const loadBankList = async () => {
      const data = await GetBankList(1, 1);
      const options = data.map(item => ({
        value: item.value,
        label: item.BankName
      }));
      setBankOptions(options);
    };

    if (modeOfPaymentOptions.length === 0) loadPaymentMethodList();
    if (bankOptions.length === 0) loadBankList();
  }, [modeOfPaymentOptions.length, bankOptions.length]);

  const [convertFromDate, setConvertFromDate] = useState(null);
  const [convertToDate, setConvertToDate] = useState(null);
  const [selectedSumary, setselectedSumary] = useState(null);
  const [cashInHand, setCashInHand] = useState("");
  const [cashFromSales, setCashFromSales] = useState("");
  const [tableData, setTableData] = useState([]);

  const handleVoucherClick = (voucherId) => {

    setSelectedVoucherId(voucherId);
    setShowvoucherModal(true);
  };
  const togglevoucherModal = () => setShowvoucherModal(!showvoucherModal);


  const handleConvertClick = (data) => {

    setCashInHand(data.cashInHand);
    setCashFromSales(data.cashFromSalesAtFactory);
    setselectedSumary({ PaymentPlanDate: data.PaymentPlanDate, cashFromSalesAtFactory: data.cashFromSalesAtFactory, cashInHand: data.cashInHand });

    setCashInHand({
      CNY: data.InHand_CNY || 0,
      USD: data.InHand_USD || 0,
      SGD: data.InHand_SGD || 0,
      IDR: data.InHand_IDR || 0,
      MYR: data.InHand_MYR || 0,
    });
    setCashFromSales({
      CNY: data.Sales_CNY || 0,
      USD: data.Sales_USD || 0,
      SGD: data.Sales_SGD || 0,
      IDR: data.Sales_IDR || 0,
      MYR: data.Sales_MYR || 0,
    });
    setSeqno(data.PaymentNo);
    setConvertFromDate(data.FromDate ? new Date(data.FromDate) : null);
    setConvertToDate(data.ToDate ? new Date(data.ToDate) : null);

    setselectedsummaryRows(data.rows);
    setConvertModalVisible(true);
  };

  const [pvViewModalVisible, setPvViewModalVisible] = useState(false);
  const [pvViewGroup, setPvViewGroup] = useState(null);

  const handlePVViewClick = (group) => {
    const mappedRows = group.rows.map(row => ({
      ...row,
      PaymentMethod: modeOfPaymentOptions.find(o => o.value === row.ModeOfPaymentId)?.label || row.paymentMethod || "-",
      BankName: bankOptions.find(o => Number(o.value) === Number(row.bank))?.label || row.bankName || "-",
      ClaimCategory: row.type || "",
      SupplierName: row.suppliername || "",
      ApplicantName: row.name || "",
      SupplierId: row.supplierid || 0,
      ApplicantId: row.u_id || 0,
      SummaryId: row.SummaryId
    }));

    setPvViewGroup({ ...group, rows: mappedRows });
    setPvViewModalVisible(true);
  };







  // --- Helper: Create CashBook/BankBook entries from claim rows ---
  const createBookEntriesFromClaims = async (rows) => {
    try {
      const entries = rows.map(row => ({
        claim_id: row.id,
        claim_no: row.claimno || "",
        amount: parseFloat(row.amount) || 0,
        payment_mode_id: row.ModeOfPaymentId || 0,
        bank_id: row.bank || 0,
        payment_date: row.paymentDate
          ? formatDateToDateOnly(row.paymentDate)
          : row.date
            ? formatDateToDateOnly(row.date)
            : null,
        supplier_id: row.supplierid || 0,
        supplier_name: row.suppliername || "",
        applicant_name: row.name || "",
        currency_code: row.curr || "IDR"
      }));

      await axios.post(`${PYTHON_API_URL}/AR/create-from-claim`, {
        entries,
        user_id: 1,
        org_id: 1,
        branch_id: 1
      });
      console.log(`✅ Created ${entries.length} book entries from claims`);
    } catch (err) {
      console.error("❌ Failed to create book entries from claims:", err);
      // Non-blocking: voucher was already generated, this is supplementary
    }
  };

  const handleGenerateVoucher = async (groupRows) => {
    // 🚫 Filter out CASH rows - Vouchers should not be created for Cash payments
    const validGroupRows = groupRows.filter(row => {
      const modeOfPaymentId = row.ModeOfPaymentId ?? row.modeOfPaymentId;
      const isCash = modeOfPaymentOptions.find(opt => opt.value === Number(modeOfPaymentId))?.label === "Cash";
      return !isCash;
    });

    if (!validGroupRows || validGroupRows.length === 0) {
      toast.warning('This group contains only Cash payments. Vouchers cannot be generated for Cash.');
      return;
    }

    const selectedGroupRows = validGroupRows;

    // Validation (Now only for selected rows)
    for (const row of selectedGroupRows) {
      // Use case-agnostic lookup for ModeOfPaymentId
      const modeOfPaymentId = row.ModeOfPaymentId ?? row.modeOfPaymentId;

      // Use Number() to ensure type-safe comparison (string "1" vs number 1)
      if (Number(modeOfPaymentId) !== 1 && !(row.bank ?? row.bankId ?? row.BankId)) {
        toast.warning(`Please select a bank for claim #${row.claimno || row.id}.`);
        return;
      }

      if (!row.date && !row.paymentDate) {
        toast.warning(`Please select a payment date for claim #${row.claimno || row.id}.`);
        return;
      }
    }

    try {
      let successCount = 0;
      let failureCount = 0;
      const successfulRows = []; // Track rows that generated vouchers successfully

      // Filter rows (Now only for selected rows)
      const cashAdvanceRows = selectedGroupRows.filter(r => (r.type || "").toUpperCase() === "CASH ADVANCE");
      const otherRows = selectedGroupRows.filter(r => (r.type || "").toUpperCase() !== "CASH ADVANCE");

      // 1. Process "Cash Advance" rows individually (One Voucher per Claim)
      for (const row of cashAdvanceRows) {
        const approveList = [{
          claimid: row.id,
          ispaymentgenerated: true,
          remarks: "",
          modeOfPaymentId: row.ModeOfPaymentId ?? row.modeOfPaymentId,
          bankId: row.bank ?? row.bankId ?? row.BankId,
          paymentDate: row.paymentDate
            ? formatDateToDateOnly(row.paymentDate)
            : row.date
              ? formatDateToDateOnly(row.date)
              : null,
        }];


        const payload = {
          approve: {
            approve: approveList,
            userId: 1,
            orgid: 1,
            branchid: 1,
          },
        };

        try {
          const res = await SaveVoucherAPI(payload);
          if (res.status) {
            successCount++;
            successfulRows.push(row);
          } else {
            failureCount++;
            console.error(`Failed to generate voucher for Cash Advance claim ${row.claimno}: ${res.message}`);
          }
        } catch (err) {
          failureCount++;
          console.error(`Error generating voucher for Cash Advance claim ${row.claimno}:`, err);
        }
      }

      // 2. Process other rows together (One Voucher for all)
      if (otherRows.length > 0) {
        const approveList = otherRows.map(row => ({
          claimid: row.id,
          ispaymentgenerated: true,
          remarks: "",
          modeOfPaymentId: row.ModeOfPaymentId ?? row.modeOfPaymentId,
          bankId: row.bank ?? row.bankId ?? row.BankId,
          paymentDate: row.paymentDate
            ? formatDateToDateOnly(row.paymentDate)
            : row.date
              ? formatDateToDateOnly(row.date)
              : null,
        }));

        const payload = {
          approve: {
            approve: approveList,
            userId: 1,
            orgid: 1,
            branchid: 1,
          },
        };

        try {
          const res = await SaveVoucherAPI(payload);
          if (res.status) {
            successCount++; // Count as 1 successful batch voucher
            successfulRows.push(...otherRows);
          } else {
            failureCount++;
            console.error(`Failed to generate grouped voucher: ${res.message}`);
          }
        } catch (err) {
          failureCount++;
          console.error(`Error generating grouped voucher:`, err);
        }
      }

      // 3. Create CashBook/BankBook entries for successfully vouchered claims
      if (successfulRows.length > 0) {
        await createBookEntriesFromClaims(successfulRows);
      }

      // Feedback
      if (successCount > 0) {
        toast.success(`Successfully generated vouchers.`);
        setTimeout(async () => {
          await GetPaymentPalnAccordianDetails(1, 1, 1, 1);
        }, 1000);
      }

      if (failureCount > 0) {
        toast.error(`Some vouchers failed to generate. Please check console.`);
      }

      load();
    } catch (error) {
      console.error('Voucher generation process failed:', error);
      toast.error('An unexpected error occurred. Please try again.');
    }
  };


  // const handleGenerateVoucher = async () => {
  //   debugger;
  //   if (selectedRows.length === 0) {
  //     toast.warning('Please select at least one row to generate a voucher.');
  //     return;
  //   }

  //   for (const row of selectedRows) {

  //     if (row.ModeOfPaymentId !== 1) {
  //       if (!row.bank) {
  //         toast.warning(`Please select a bank for claim #${row.claimno || row.id}.`);
  //         return;
  //       }
  //     }


  //     if (!row.date) {
  //       toast.warning(`Please select a payment date for claim #${row.claimno || row.id}.`);
  //       return;
  //     }
  //   }

  //   try {
  //     const approveList = selectedRows.map(row => ({
  //       claimid: row.id,
  //       ispaymentgenerated: true,
  //       remarks: "", // optional
  //       modeOfPaymentId: row.ModeOfPaymentId,
  //       bankId: row.bank,
  //       paymentDate: row.date
  //         ? formatDateToDateOnly(row.paymentDate)
  //         : row.date
  //           ? formatDateToDateOnly(row.date)
  //           : null,
  //     }));

  //     const payload = {
  //       approve: {
  //         approve: approveList,
  //         userId: 1,
  //         orgid: 1,
  //         branchid: 1,
  //       },
  //     };

  //     const res = await SaveVoucherAPI(payload);

  //     if (res.status) {
  //       toast.success('Voucher has been created successfully.');
  //       setTimeout(async () => {
  //         await GetPaymentPalnAccordianDetails(1, 1, 1, 1);
  //       }, 1000);
  //     }
  //     else {
  //       toast.error(res.message || 'Something went wrong.');
  //     }
  //   } catch (error) {
  //     console.error('Voucher generation failed:', error);
  //     toast.error('API call failed. Please try again.');
  //   }
  // };

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

  // State: PPP PV Director approval status keyed by SummaryId
  const [pvDirectorApprovalMap, setPvDirectorApprovalMap] = useState({});

  const fetchPvDirectorApprovalStatus = async () => {
    try {
      const res = await axios.get(`${PYTHON_API_URL}/api/claim/get_pv_director_approval_status`);
      if (res.data && res.data.status && res.data.data) {
        console.log('🔒 PV Director Approval Map:', res.data.data);
        setPvDirectorApprovalMap(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch PV director approval status:", err);
    }
  };

  const load = async () => {
    const res = await GetPaymentPalnAccordianDetails(1, 1, 1, 1);

    if (res.status) {
      setclaims(res.data);
      await fetchPvDirectorApprovalStatus();
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Initial Load Failed',
        text: res.message || 'Unable to fetch payment plan data.',
      });
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
  useEffect(() => {


    const fetchClaimApprovedDetails = async () => {
      const res = await GetPaymentPalnAccordianDetails(1, 1, 1, 1);
      if (res.status) {
        setclaims(res.data);
        await fetchPvDirectorApprovalStatus();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Initial Load Failed',
          text: res.message || 'Unable to fetch payment plan data.',
        });
      }
    };

    fetchClaimApprovedDetails();

  }, []);

  const handleClick1 = (action, id) => {
    setAction1(prev => ({ ...prev, [id]: action }));
  };

  const handleClick2 = (action, id) => {
    setAction2(prev => ({ ...prev, [id]: action }));
  };

  const handleCheckboxChange = (e, rowData) => {
    const updatedSelection = e.checked
      ? [...selectedRows, rowData.id]
      : selectedRows.filter(id => id !== rowData.id);
    setSelectedRows(updatedSelection);
  };
  const ApproverIndicator = ({ approved, discussed }) => {
    let severity = 'secondary'; // default gray
    if (approved === 1) severity = 'success';
    else if (discussed === 1) severity = 'warning';
    else severity = 'danger';

    const label = approved === 1
      ? 'Approved'
      : discussed === 1
        ? 'Discussed'
        : 'Pending';

    return <Badge style={{ width: "85px", fontSize: "13px", margin: "3px" }} value={label} severity={severity} />;
  };

  const ApproverGridIndicator = ({ approved, discussed }) => {
    let severity = 'secondary'; // default gray
    if (approved === 1) severity = 'success';
    else if (discussed === 1) severity = 'warning';
    else severity = 'danger';

    const label = approved === 1
      ? 'A'
      : discussed === 1
        ? 'D'
        : 'P';

    return <Badge style={{ width: "5px", fontSize: "13px", margin: "0px" }} value={label} severity={severity} />;
  };
  const handleSaveComment = () => {
    if (selectedClaim) {
      // Update the comment in the selected claim
      const updatedClaims = claims.map(claim =>
        claim.id === selectedClaim.id
          ? { ...claim, comment: selectedClaim.comment }
          : claim
      );

      // Update the state with the new claims array
      setclaims(updatedClaims);

      // Optionally, close the modal
      setShowModal(false);
    }
  };


  const groupedBySummary = claims.reduce((acc, item) => {

    const key = item.SummaryId;
    if (!acc[key]) acc[key] = {
      type: item.type, PaymentNo: item.PaymentNo, PaymentPlanDate: item.PaymentPlanDate, cashInHand: item.cashInHand, cashFromSalesAtFactory: item.cashFromSalesAtFactory,
      FromDate: item.FromDate, ToDate: item.ToDate, InHand_CNY: item.InHand_CNY, InHand_USD: item.InHand_USD, InHand_SGD: item.InHand_SGD, InHand_IDR: item.InHand_IDR,
      InHand_MYR: item.InHand_MYR, Sales_CNY: item.Sales_CNY, Sales_USD: item.Sales_USD, Sales_SGD: item.Sales_SGD, Sales_IDR: item.Sales_IDR, Sales_MYR: item.Sales_MYR,
      PPP_PV_Director_approve: item.PPP_PV_Director_approve, PPP_PV_Commissioner_approveone: item.PPP_PV_Commissioner_approveone,
      rows: []
    };
    acc[key].rows.push(item);
    return acc;
  }, {});

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
  const headerTemplate = (type) => (
    <div className="d-flex justify-content-between align-items-center">
      <span>{type}</span>
      <Button
        icon="pi pi-history"
        className="p-button-text"
        onClick={(e) => {
          e.stopPropagation();
          setHistoryForType(type);
          setHistoryVisible(true);
        }}
        tooltip="History" tooltipOptions={{ position: 'bottom' }}
      />
    </div>
  );

  const handleShowDetails = async (row) => {
    const res = await ClaimAndPaymentGetById(row.id, 1, 1);
    if (res.status) {
      if (res.data && res.data.header) {
        res.data.header.paymentmethodname = row.paymentMethod;
      }
      let details = res.data.details || [];

      // Logic to fetch PRs via POs (similar to Manageclaim&Payment.js)
      try {
        const uniquePOIds = [...new Set(details.map(d => d.poid).filter(id => id > 0))];

        if (uniquePOIds.length > 0) {
          setselectedpoids(uniquePOIds);
        } else {
          setselectedpoids([]);
        }

        if (uniquePOIds.length > 0) {
          const poToPrMap = {};

          // Fetch details for each PO found in the claim lines
          await Promise.all(uniquePOIds.map(async (poid) => {
            try {
              // Using default org/branch as 1, 1 similar to other calls in this file
              const poRes = await GetByIdPurchaseOrder(poid, 1, 1);
              if (poRes.status && poRes.data?.Requisition) {
                const requisitions = poRes.data.Requisition;

                // Collect unique PR numbers
                // We map the PO to its PR(s). If multiple PRs exist for one PO, we concat them.
                const prNumbers = [...new Set(requisitions.map(r => r.prnumber).filter(Boolean))].join(", ");
                const firstPrId = requisitions.find(r => r.prid > 0)?.prid;

                poToPrMap[poid] = {
                  prnumber: prNumbers || "NA",
                  prid: firstPrId
                };
              }
            } catch (err) {
              console.error(`Failed to fetch details for PO ${poid}`, err);
            }
          }));

          // Enrich details with PR info from the map
          details = details.map(d => {
            if (d.poid && poToPrMap[d.poid]) {
              return {
                ...d,
                prno: poToPrMap[d.poid].prnumber,
                prid: poToPrMap[d.poid].prid
              };
            }
            return { ...d, prno: "NA" };
          });
        }
      } catch (error) {
        console.error("Error enriching PR details:", error);
      }

      setSelectedDetail({ ...res.data, details: details });
      setDetailVisible(true);

      setPreviewUrl(res.data?.header?.AttachmentPath || "");
      setFileName(res.data?.header?.AttachmentName || "");

    }
    else {
      Swal.fire("Error", "Data is not available", "error");

    }
  };
  const grouped = claims.reduce((acc, item) => {
    (acc[item.type] = acc[item.type] || []).push(item);
    return acc;
  }, {});
  const exportToExcel = () => {
    // Flatten all claims grouped by type
    const allClaims = Object.entries(grouped)
      .flatMap(([type, items]) => items.map(item => ({
        Type: type,
        "Claim #": item.claimno,
        "Claim Date": item.date,
        "Applicant Name": item.name,
        "Applicant Department": item.dept,
        "Supplier Name": item.suppliername,
        "Tax Amount": (item.taxrate || item.taxvalue || item.TaxValue || item.taxAmount || item.TaxAmount || item.tax_rate || item.TaxRate || item.taxAmt || item.TaxAmt || 0),
        "Vat Amount": (item.vatrate || item.vatvalue || item.vatValue || item.VatValue || item.vatAmount || item.VatAmount || item.vat_rate || item.VatRate || item.vatAmt || item.VatAmt || 0),
        "Claim Amount in TC": item.amount,
        "Currency": item.curr,
        "GM Status": item.approvedone === 1 ? 'Approved' : item.discussedone === 1 ? 'Discussed' : 'Pending',
        "Director Status": item.approvedtwo === 1 ? 'Approved' : item.discussedtwo === 1 ? 'Discussed' : 'Pending',
        "Remarks": item.comment || '',
        "Purpose": item.multipurpose || ''
      })));

    const worksheet = XLSX.utils.json_to_sheet(allClaims);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Claim Approval");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array"
    });

    const blob = new Blob([excelBuffer], {
      type: "application/octet-stream"
    });

    saveAs(blob, "Claim_Approval.xlsx");
  };


  const handlePrintPVs = async (groupRows) => {
    // 1. Identify unique vouchers
    const uniqueVoucherIds = [...new Set(groupRows.map(r => r.voucherid).filter(id => id && id > 0))];

    if (uniqueVoucherIds.length === 0) {
      toast.warning("No vouchers generated for this group.");
      return;
    }

    // 2. Open window synchronously to avoid popup blockers
    const newWin = window.open("", "Print-Window");
    if (!newWin) {
      toast.error("Pop-up blocker prevented printing. Please allow pop-ups for this site.");
      return;
    }

    // Show initial loading state in the new window
    newWin.document.write(`
      <html>
        <head><title>Preparing Vouchers...</title></head>
        <body style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh;">
          <h3>Preparing voucher preview... Please wait.</h3>
        </body>
      </html>
    `);
    newWin.document.close();

    const loadingToast = toast.info("Preparing vouchers for print...", { autoClose: false });

    try {
      // 3. Fetch data for all vouchers in parallel
      const voucherDataList = await Promise.all(
        uniqueVoucherIds.map(async (voucherId) => {
          try {
            const response = await GetPaymentVoucher(voucherId, 1, 1);
            return response.status && response.data ? response.data : null;
          } catch (err) {
            console.error(`Error fetching voucher ${voucherId}:`, err);
            return null;
          }
        })
      );

      const validVoucherList = voucherDataList.filter(v => v !== null);

      if (validVoucherList.length === 0) {
        toast.dismiss(loadingToast);
        toast.error("Failed to fetch voucher details.");
        newWin.close();
        return;
      }

      // 4. Generate HTML Mirroring your PaymentVoucher.js exactly
      let combinedHtml = "";

      validVoucherList.forEach((voucherData, index) => {
        const header = voucherData?.header || {};
        const details = Array.isArray(voucherData?.details) ? voucherData.details : [];
        const signatures = Array.isArray(voucherData?.signatures) ? voucherData.signatures : [];

        const total = details.reduce((sum, item) => sum + Number(item.amount || 0), 0);

        // Amount in Words Logic (Same as your PaymentVoucher component)
        let words = "Zero";
        try {
          const [dollars, cents] = total.toFixed(2).split('.');
          const currencyNames = { IDR: 'Rupiah', USD: 'Dollar', MYR: 'Ringgit', SGD: 'Dollar', CNY: 'Yuan' };
          const currencyName = currencyNames[header?.currencyCode] || header?.currencyCode || "";

          words = `${toWords(Number(dollars)).replace(/\b\w/g, c => c.toUpperCase())}`;
          if (Number(cents) > 0) {
            words += ` and ${toWords(Number(cents)).replace(/\b\w/g, c => c.toUpperCase())} Cent`;
          }
          words += ` ${currencyName}`;
        } catch (err) { words = "Amount Error"; }

        const polist = Array.from(new Set(details.map(d => d.po).filter(Boolean))).join(', ');
        const pageBreakStyle = index < validVoucherList.length - 1 ? 'page-break-after: always; break-after: page;' : '';

        combinedHtml += `
          <div class="voucher-page" style="${pageBreakStyle}">
           
            <div class="voucher-header">
              <img src="/logo.png" alt="Logo" class="voucher-logo" />
              <div class="company-details">
                <p class="company-name">${header?.companyName || ""}</p>
                <p class="company-info">${header?.address1 || ""}, ${header?.address2 || ""}, ${header?.address3 || ""}</p>
                <p class="company-info">WebSite ${header?.webSite || ""} E-mail ${header?.email || ""}</p>
                <p class="company-info">Telp ${header?.telePhone || ""}</p>
              </div>
            </div>

            <div class="voucher-title">
              ${header?.header || "PAYMENT VOUCHER"}
            </div>

            <table class="info-table">
              <tbody>
                <tr>
                  <td class="info-label info-left-label">Payment To</td>
                  <td class="info-colon"> : </td>
                  <td class="info-value info-left-value">${header?.paymentTo || ""}</td>
                  <td class="info-spacer"></td>
                  <td class="info-label info-right-label">PV #</td>
                  <td class="info-colon"> : </td>
                  <td class="info-value info-right-value">${header?.voucherNo || ""}</td>
                </tr>
                <tr>
                  <td class="info-label">Payment Method</td>
                  <td class="info-colon"> : </td>
                  <td class="info-value">${header?.paymentMethod || ""}</td>
                  <td class="info-spacer"></td>
                  <td class="info-label">Payment Date</td>
                  <td class="info-colon"> : </td>
                  <td class="info-value">${header?.paymentDate || ""}</td>
                </tr>
                <tr>
                  <td class="info-label">
                    ${(header?.paymentMethod === "Cash" || details[0]?.accountName) ? 'Account Name' : ''}
                  </td>
                  <td class="info-colon">
                    ${(header?.paymentMethod === "Cash" || details[0]?.accountName) ? ' : ' : ''}
                  </td>
                  <td class="info-value">
                    ${header?.paymentMethod === "Cash" ? 'Cash in hand' : (details[0]?.accountName || "")}
                  </td>
                  <td class="info-spacer"></td>
                  <td class="info-label">Issue Date</td>
                  <td class="info-colon"> : </td>
                  <td class="info-value">${header?.voucherDate || ""}</td>
                </tr>
                ${header?.isSupplier == 1 ? `
                <tr>
                  <td class="info-label">PO & WO</td>
                  <td class="info-colon"> : </td>
                  <td class="info-value" colspan="5">${polist}</td>
                </tr>
                ` : ''}
              </tbody>
            </table>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 3%; text-align: center;">No</th>
                  <th style="width: 15%; text-align: center;">Claim No</th>
                  <th style="width: 57%; text-align: center;">Purpose</th>
                  <th style="width: 25%; text-align: center;">Amount ${header?.currencyCode || ""}</th>
                </tr>
              </thead>
              <tbody>
                ${details.map((item, idx) => `
                  <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td>${item?.claimno || ""}</td>
                    <td style="text-align: left;">${item?.purpose || ""}</td>
                    <td style="text-align: right;">${(item?.amount || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="3" style="text-align: center;">TOTAL</td>
                  <td style="text-align: right;">${(total || 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <p class="words-p"><strong>Amount in Words :</strong> ${words}</p>

            <div class="signatures-container">
              <div class="signatures-left">
                ${signatures.map(sig => `
                  <div class="signature-box-left">
                    <div class="signature-space"></div>
                    <span class="signature-label">${sig?.label || ""}</span>
                  </div>
                `).join('')}
              </div>

              ${header?.paymentMethod == "Cash" || header?.paymentMethod == "Cheque" ? `
              <div class="signature-box-right">
                <div class="signature-border-box"></div>
                <span class="signature-label">Applicant's Signature</span>
              </div>
              ` : ''}
            </div>

            <div class="print-footer">
              Printed on ${new Date().toLocaleString()}
            </div>
          </div>
        `;
      });

      toast.dismiss(loadingToast);

      // 5. Update the same window with final content
      newWin.document.open();
      newWin.document.write(`
        <html>
          <head>
            <title>Batch Print Vouchers</title>
            <style>
              @page { size: A5 landscape; margin: 0; }
              body { margin: 0; padding: 0; background-color: #fff; font-family: Arial, sans-serif; font-size: 11.5px; color: #000; }
              @media print {
                body { -webkit-print-color-adjust: exact; }
                .voucher-page { page-break-inside: avoid; break-inside: avoid; }
              }
              .voucher-page {
                position: relative;
                padding: 20px 25px;
                box-sizing: border-box;
                width: 210mm;
                height: 148mm;
                display: flex;
                flex-direction: column;
                background-color: #fff;
              }
              .voucher-header {
                display: flex;
                justify-content: flex-start;
                align-items: flex-start;
                margin-bottom: 5px;
                gap: 15px;
              }
              .voucher-logo {
                height: 70px;
                width: 80px;
              }
              .company-details {
                line-height: 1.3;
              }
              .company-name {
                font-weight: bold;
                margin: 0;
                font-size: 14px;
              }
              .company-info {
                margin: 0;
                font-size: 11px;
              }
              .voucher-title {
                text-align: center;
                font-size: 16px;
                font-weight: bold;
                margin-top: 5px;
                margin-bottom: 8px;
                letter-spacing: 2px;
                text-transform: uppercase;
              }
              .info-table {
                width: 100%;
                border-collapse: separate;
                font-size: 12px;
                margin-bottom: 10px;
                border: none;
              }
              .info-label {
                font-weight: bold;
                white-space: nowrap;
                padding: 3px 2px;
                vertical-align: top;
                border: none;
              }
              .info-left-label {
                width: 120px;
              }
              .info-right-label {
                width: 110px;
              }
              .info-colon {
                width: 10px;
                padding: 3px 2px;
                vertical-align: top;
                border: none;
                text-align: center;
              }
              .info-value {
                padding: 3px 2px;
                vertical-align: top;
                border: none;
              }
              .info-left-value {
                width: 250px;
                word-break: break-word;
              }
              .info-right-value {
                word-break: break-word;
              }
              .info-spacer {
                padding: 3px 2px;
                vertical-align: top;
                border: none;
              }
              .items-table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #000;
                font-size: 12px;
              }
              .items-table th, .items-table td {
                border: 1px solid #000;
                padding: 6px;
              }
              .items-table th {
                background-color: #f2f2f2;
                color: #000;
                font-weight: bold;
              }
              .total-row {
                font-weight: bold;
                background-color: #f2f2f2;
              }
              .words-p {
                margin-top: 10px;
                font-size: 12px;
                margin-bottom: 10px;
              }
              .signatures-container {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                margin-top: 15px;
              }
              .signatures-left {
                display: flex;
                gap: 40px;
              }
              .signature-box-left {
                text-align: center;
              }
              .signature-space {
                height: 35px;
              }
              .signature-label {
                font-size: 11px;
              }
              .signature-box-right {
                text-align: center;
              }
              .signature-border-box {
                border: 1px solid black;
                width: 180px;
                height: 45px;
                margin-bottom: 5px;
              }
              .print-footer {
                margin-top: auto;
                padding-top: 10px;
                text-align: right;
                font-size: 9px;
              }
            </style>
          </head>
          <body onload="window.print();">
            ${combinedHtml}
          </body>
        </html>
      `);
      newWin.document.close();

    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Batch print error:", error);
      toast.error("An error occurred while printing vouchers.");
      newWin.close();
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
  const printArrayData = (data) => {
    const tableHeaders = `
      <tr>
        <th>Claim#</th>
        <th>Date</th>
        <th>Name</th>
        <th>Department</th>
        <th>Supplier</th>
        <th>Tax</th>
        <th>VAT</th>
        <th>Amount</th>
        <th>Currency</th>
        <th>GM</th>
        <th>Director</th>
        <th>Remarks</th>
      </tr>`;

    const tableRows = data
      .map((item) => {
        const gm =
          item.approvedone === 1
            ? "Approved"
            : item.discussedone === 1
              ? "Discussed"
              : "Pending";
        const director =
          item.approvedtwo === 1
            ? "Approved"
            : item.discussedtwo === 1
              ? "Discussed"
              : "Pending";

        return `
          <tr>
            <td>${item.claimno}</td>
            <td>${item.date}</td>
            <td>${item.name}</td>
            <td>${item.dept}</td>
                <td>${item.suppliername}</td>
            <td style="text-align:right">${(item.taxrate || item.taxvalue || item.TaxValue || item.taxAmount || item.TaxAmount || item.tax_rate || item.TaxRate || item.taxAmt || item.TaxAmt || 0)}</td>
            <td style="text-align:right">${(item.vatrate || item.vatvalue || item.vatValue || item.VatValue || item.vatAmount || item.VatAmount || item.vat_rate || item.VatRate || item.vatAmt || item.VatAmt || 0)}</td>
            <td style="text-align:right">${item.amount}</td>
            <td>${item.curr}</td>
            <td>${gm}</td>
            <td>${director}</td>
            <td>${item.comment || ""}</td>
          </tr>`;
      })
      .join("");

    const htmlContent = `
      <html>
        <head>
          <title>Print Claims</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; }
            th { background-color: #f4f4f4; }
          </style>
        </head>
        <body>
          <h2>Claim Approval Report</h2>
          <table>${tableHeaders}${tableRows}</table>
        </body>
      </html>`;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };



  const actionpoBodyTemplate = (rowData) => {
    return <span style={{ cursor: "pointer", color: "blue" }} className="btn-rounded btn btn-link"
      onClick={() => handleShowPODetails(rowData)}>{rowData.pono}</span>;
  };

  const actionprBodyTemplate = (rowData) => {
    return <span style={{ cursor: "pointer", color: "blue" }} className="btn-rounded btn btn-link"
      onClick={() => handlePRClick(rowData.prid)}>{rowData.prno}</span>;
  };

  const handleShowPODetails1 = async (row) => {
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


  const exportGroupToExcel = (group) => {
    if (!group || !group.rows || group.rows.length === 0) {
      toast.warning("No data found in this group.");
      return;
    }
    debugger;

    const sheetData = group.rows.map(item => ({
      "Type": item.type,
      "Claim #": item.claimno,
      "Claim Date": item.date,
      "Applicant Name": item.name,
      "Applicant Department": item.dept,
      "Supplier Name": item.suppliername,
      "Tax Amount": (item.taxrate || item.taxvalue || item.TaxValue || item.taxAmount || item.TaxAmount || item.tax_rate || item.TaxRate || item.taxAmt || item.TaxAmt || 0),
      "Vat Amount": (item.vatrate || item.vatvalue || item.vatValue || item.VatValue || item.vatAmount || item.VatAmount || item.vat_rate || item.VatRate || item.vatAmt || item.VatAmt || 0),
      "Claim Amount in TC": item.amount,
      "Currency": item.curr,
      "GM Status": item.approvedone === 1 ? 'Approved' : item.discussedone === 1 ? 'Discussed' : 'Pending',
      "Director Status": item.approvedtwo === 1 ? 'Approved' : item.discussedtwo === 1 ? 'Discussed' : 'Pending',
      "Remarks": item.comment || '',
      "Purpose": item.multipurpose || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `PPP_${group.PaymentNo}`);

    XLSX.writeFile(workbook, `PPP_${group.PaymentNo}.xlsx`);
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

          <Breadcrumbs title="Finance" breadcrumbItem="Periodic Payment Plan" />

          {/* 🔍 Search Filter */}
          <Card className="p-3 mb-3">
            <Row className="align-items-center g-2">

              {/*            
                     <Col lg="6" md="6">
                     <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                               
                               {types.map((type, index) => (
                                   <div key={index} className="p-field-radiobutton" style={{ display: 'flex', alignItems: 'center' }}>
                                       <RadioButton
                                           inputId={type}
                                           name="type"
                                           value={type}
                                           onChange={(e) => setSelectedType(e.value)}
                                           checked={selectedType === type}
                                       />
                                       <span htmlFor={type} style={{ marginLeft: '8px',fontWeight:"bold" }}>{type}</span>
                                   </div>
                               ))}
                           </div>
           
                     
           </Col> */}
              <Col lg="12" md="8">


                <div className="text-end button-items">
                  {/* <button type="button" className="btn btn-primary" onClick={handleGenerateVoucher}>
                    <i className="bx bx-plus-circle label-icon font-size-16 align-middle me-2"></i> Generate Voucher
                  </button> */}
                  {/* <button type="button" className="btn btn-warning">
    <i className="bx bx-chat label-icon font-size-16 align-middle me-2"></i> Discuss
  </button> */}

                  {/*
let severity = 'secondary'; // default gray
    if (approved === 1) severity = 'success';
    else if (discussed === 1) severity = 'warning';
    else severity = 'danger'; */}


                  <Badge style={{ width: "5px", fontSize: "13px", margin: "3px" }} value={"A"} severity={"success"} /><b> Approved </b>
                  <Badge style={{ width: "5px", fontSize: "13px", margin: "3px" }} value={"D"} severity={"warning"} /> <b> Discussed  </b>
                  <Badge style={{ width: "5px", fontSize: "13px", margin: "3px" }} value={"P"} severity={"danger"} /> <b> Pending  </b>
                  <button type="button" className="btn btn-danger" onClick={() => { load(); }}>
                    <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i> Cancel
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={exportToExcel}>
                    <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Export
                  </button>

                  <button type="button" data-access="print" className="btn btn-primary" onClick={() => printArrayData(claims)}>
                    <i className="bx bx-printer label-icon font-size-16 align-middle me-2"></i> Print
                  </button>
                </div>
              </Col>
            </Row>
          </Card>


          <Row>
            <Col lg="12">
              <Card>

                <Accordion multiple>
                  {Object.entries(groupedBySummary)
                    .sort(([, a], [, b]) =>
                      String(b.PaymentNo).localeCompare(String(a.PaymentNo), undefined, {
                        numeric: true,
                      })
                    ).map(([summaryId, group]) => {
                      const allApproved = group.rows.every(
                        row => Number(row.approvedtwo) === 1
                      );
                      const hasVoucher = group.rows.some(row => row.voucherid);
                      const allHaveVoucher = group.rows.every(row => row.voucherid);

                      // 🔒 Lockdown Logic: Disable when PPP PV Voucher is Director-approved
                      // Check the Python API approval map by SummaryId
                      const approvalEntry = pvDirectorApprovalMap[String(summaryId)];
                      const isVoucherApprovedByDirector = !!(approvalEntry && Number(approvalEntry.PPP_PV_Director_approve) === 1);

                      const authUser = JSON.parse(localStorage.getItem("authUser"));
                      const currentUserId = authUser ? (parseInt(authUser.u_id) || 0) : 0;
                      const isSuperAdmin = currentUserId === 158;

                      const restrictedUpdateVoucherUsers = [138, 139, 140];
                      // If user is restricted, they should ONLY see "Generate Voucher" (when hasVoucher is false).
                      // If hasVoucher is true (Update mode), hide the button.
                      const showVoucherButton = !hasVoucher || !restrictedUpdateVoucherUsers.includes(currentUserId);

                      return (
                        <AccordionTab
                          key={summaryId}
                          header={`Payment Plan Date: ${group.PaymentPlanDate} / PPP Number: ${group.PaymentNo}`}
                        >
                          <div className="d-flex justify-content-end mb-2">
                            {group.type !== "PPP PV" && (
                              <button
                                style={{ marginRight: "10px" }}
                                className="btn btn-primary"
                                onClick={() => handlePVViewClick(group)}
                              >
                                PV View
                              </button>
                            )}
                            {showVoucherButton && (
                              <button className="btn btn-success" style={{ marginRight: "10px" }}
                                disabled={!isSuperAdmin && isVoucherApprovedByDirector}
                                onClick={() => handleGenerateVoucher(group.rows)}>
                                {hasVoucher ? "Update Voucher" : "Generate Voucher"}
                              </button>
                            )}
                            {!access.loading && access.canViewDetails && (
                              <button
                                style={{ marginRight: "10px" }}
                                data-access="viewdetails"
                                className="btn btn-info"
                                onClick={() => handleConvertClick(group)}
                              >
                                PPP View
                              </button>
                            )}
                            {hasVoucher && (
                              <button
                                style={{ marginRight: "10px" }}
                                className="btn btn-secondary"
                                onClick={() => handlePrintPVs(group.rows)}
                              >
                                <i className="bx bx-printer label-icon font-size-16 align-middle me-2"></i>
                                Print PVs
                              </button>
                            )}
                            <button
                              className="btn btn-secondary"
                              onClick={() => exportGroupToExcel(group)}
                            >
                              <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i>
                              Export
                            </button>
                          </div>

                          {group.type === "PPP PV" ? (
                            <PaymentSummaryTable claims={group.rows} approvedata={group} onRefresh={() => load()} handlePRClick={handlePRClick} />
                          ) : (
                            <ApprovalTable
                              setData={setclaims}
                              type={group.type}
                              data={group.rows}
                              ApproverIndicator={ApproverIndicator}
                              selectedRows={selectedRows}
                              setSelectedRows={setSelectedRows}
                              handleCheckboxChange={handleCheckboxChange}
                              handleShowDetails={handleShowDetails}
                              handleVoucherClick={handleVoucherClick}
                              ApproverGridIndicator={ApproverGridIndicator}
                              access={access}
                              modeOfPaymentOptions={modeOfPaymentOptions}
                              bankOptions={bankOptions}
                            />
                          )}
                        </AccordionTab>
                      )
                    })}
                </Accordion>


                {/* <Accordion multiple>
                  {Object.entries(grouped).map(([type, rows]) => (
                    <AccordionTab key={type} header={headerTemplate(type)}>

{Object.entries(groupedBySummary).filter(([_, group]) => group.type === type).map(([summaryId, group]) => (

<Card key={summaryId} className="mb-4">
<div className="d-flex justify-content-between align-items-center alert alert-primary mb-0">
  <div>
    <strong>Payment Plan Date:</strong> {group.PaymentPlanDate}
    <strong> / PPP Number:</strong> {group.PaymentNo}
  </div>
  <div></div>
  <button
    type="button" style={{float:"right",marginLeft:"25%"}}
    className="btn btn-success"
    onClick={() => handleGenerateVoucher(group.rows)}
  >
    <i className="bx bx-plus-circle label-icon font-size-16 align-middle me-2"></i>
    Generate Voucher
  </button>

  <button type="button" className="btn btn-success" onClick={() =>handleConvertClick(group)} >
  PPP View
  </button>
</div>


          <ApprovalTable
            setData={setclaims}
            type={type}
            data={group.rows}

            ApproverIndicator={ApproverIndicator}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
            handleCheckboxChange={handleCheckboxChange}
            handleShowDetails={handleShowDetails}
            handleVoucherClick={handleVoucherClick}
            ApproverGridIndicator={ApproverGridIndicator}
          />
                 
                            </Card>
 ))}
                    </AccordionTab>

                   
                  ))}
                </Accordion> */}
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
      <Dialog

        visible={showModal}
        onHide={() => setShowModal(false)}
        style={{ width: '50vw', maxWidth: '600px' }}
        breakpoints={{ '960px': '75vw', '640px': '100vw' }}
        contentStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        <Input
          type="textarea"
          className="custom-textarea"
          value={selectedClaim?.comment || ''}
          onChange={(e) =>
            setSelectedClaim({ ...selectedClaim, comment: e.target.value })
          }
          placeholder="Enter your comment"
        />
        <div className="mt-3 text-end">
          <Button label="Save" icon="pi pi-check" onClick={handleSaveComment} />
        </div>
      </Dialog>


      <Modal isOpen={convertModalVisible} className="modal-fullscreen" toggle={() => setConvertModalVisible(false)}>

        <ModalHeader toggle={() => setConvertModalVisible(false)}>

          <div className="d-flex justify-content-between align-items-center w-100" >
            <span>Payment Summary</span>

          </div>
        </ModalHeader>
        <ModalBody>
          <Row className="mb-3">

            <Col md="2">
              <label className="form-label">PPP Number</label>
              <Input type="text" disabled={true} value={Seqno}></Input>
            </Col>


            <Col md="3">
              <label className="form-label">From Date</label>
              <Flatpickr
                className="form-control"
                placeholder="From Date"
                options={{
                  dateFormat: "Y-m-d",
                  altInput: true,
                  altFormat: "d-M-Y"
                }}
                disabled={true}
                value={convertFromDate}



              />
            </Col>

            <Col md="3">
              <label className="form-label">To Date</label>
              <Flatpickr
                className="form-control"
                placeholder="To Date"
                options={{
                  dateFormat: "Y-m-d",
                  altInput: true,
                  altFormat: "d-M-Y"
                }}
                disabled={true}
                value={convertToDate}

              />
            </Col>

            <Col md="4">
              <div className="d-flex justify-content-end align-items-end h-100">



                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setConvertModalVisible(false)}
                >
                  <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>
                  Close
                </button>
              </div>
            </Col>
          </Row>

          <hr />
          {(() => {
            const currencies = ["IDR", "SGD", "USD", "MYR", "CNY"];



            const getAmountForCategoryCurrency = (category, currency, method) => {
              return selectedsummaryRows
                .filter(r =>
                  r.type === category &&
                  r.curr === currency // &&
                  // (!method || (r.paymentMethod || '').toLowerCase() === method.toLowerCase())
                )
                .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
            };


            const buildTable = (data) => {
              if (!data || data.length === 0) return null;

              const currencies = ["IDR", "SGD", "USD", "MYR", "CNY"];

              // Group data by PaymentMethod
              const grouped = data.reduce((acc, row) => {
                const method = row.paymentMethod || "-";
                if (!acc[method]) acc[method] = { rows: [], method };
                acc[method].rows.push(row);
                return acc;
              }, {});

              // Calculate overall totals
              const overallTotals = currencies.reduce((acc, curr) => {
                acc[curr] = data
                  .filter(r => r.curr === curr)
                  .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
                return acc;
              }, {});

              // Create rows for the table body
              const rows = Object.values(grouped).map((group, index) => {
                const rowTotals = currencies.reduce((acc, curr) => {
                  acc[curr] = group.rows
                    .filter(r => r.curr === curr)
                    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
                  return acc;
                }, {});

                return (

                  <tr key={`row-${index}`}>
                    <td style={{ textAlign: "left" }}>{group.method}</td>
                    {currencies.map(curr => (
                      <td style={{ textAlign: "right" }} key={curr}>
                        {rowTotals[curr].toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                    ))}
                  </tr>
                );
              });

              // Total row
              const totalRow = (
                <tr style={{ backgroundColor: "#f1f1f1", fontWeight: "bold" }}>
                  <td>Total</td>
                  {currencies.map(curr => (
                    <td style={{ textAlign: "right" }} key={`total-${curr}`}>
                      {overallTotals[curr].toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                  ))}
                </tr>
              );

              // Cash Withdraw row
              const cashWithdrawMopRow = (
                <tr style={{ fontWeight: "bold", backgroundColor: "#fff3cd" }}>
                  <td style={{ textAlign: "left" }}>Cash Withdraw</td>
                  {currencies.map(curr => {
                    const modeOfCashTotal = data
                      .filter(r => (r.paymentMethod || "").toLowerCase().includes("cash"))
                      .filter(r => r.curr === curr)
                      .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

                    const cihValue = parseFloat(cashInHand[curr] || 0);
                    const cfsValue = parseFloat(cashFromSales[curr] || 0);
                    const needed = modeOfCashTotal - cihValue - cfsValue;

                    return (
                      <td style={{ textAlign: "right" }} key={`cash-needed-mop-${curr}`}>
                        {needed.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                    );
                  })}
                </tr>
              );

              return [...rows, totalRow, cashWithdrawMopRow]; // Return rows, total, and cash withdraw row
            };


            // const getAmountForCategoryCurrency = (category, currency, cashOnly = null) => {
            //   if(cashOnly=="Cash"){

            //     return selectedsummaryRows
            //     .filter(r =>
            //       r.curr === currency &&
            //         (r.paymentMethod || "").toLowerCase() === "cash"
            //     )
            //     .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
            //   }
            //   else{
            //   return selectedsummaryRows
            //     .filter(r =>
            //       r.type === category &&
            //       r.curr === currency &&

            //         (r.paymentMethod || "").toLowerCase() !== "cash"

            //     )
            //     .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
            //   }
            // };


            const getTotalA = () => {
              return currencies.reduce((acc, curr) => {
                const val = parseFloat(cashInHand[curr] || 0) + parseFloat(cashFromSales[curr] || 0);
                return { ...acc, [curr]: val };
              }, {});
            };

            const getTotalB = () => {
              return currencies.reduce((acc, curr) => {
                const val = ["Claim", "Cash Advance", "Supplier Payment"]
                  .reduce((sum, cat) =>
                    sum + getAmountForCategoryCurrency(cat, curr, "Cash")
                    , 0);
                return { ...acc, [curr]: val };
              }, {});
            };

            // const getTotalB = () => {
            //   return currencies.reduce((acc, curr) => {
            //     // sum non-cash categories
            //     const nonCash = ["Claim", "Cash Advance", "Supplier Payment"]
            //       .reduce((sum, cat) => sum + getAmountForCategoryCurrency(cat, curr, "NonCash"), 0);

            //     // sum cash withdrawals (once)
            //     const cash = getAmountForCategoryCurrency(null, curr, "Cash");

            //     return { ...acc, [curr]: nonCash + cash };
            //   }, {});
            // };
            const formatWithCommas = (value) => {
              if (!value) return '';
              const parts = value.toString().split('.');
              const intPart = parts[0];
              const decPart = parts[1];
              const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
              return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
            };
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

            const totalA = getTotalA();
            const totalB = getTotalB();
            const cashNeeded = getCashNeeded();
            const bankPayment = getBankPayment();

            return (
              <>

                <h5>Finance Summary</h5>
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
                      <td>Cash Needed (B - A)</td>
                      {currencies.map(curr => (
                        <td key={`cashNeeded-${curr}`} className="text-end">
                          {cashNeeded[curr]?.toLocaleString()}
                        </td>
                      ))}
                    </tr>

                    {/* Cash In Hand */}
                    <tr>
                      <td>Cash in Hand</td>
                      {currencies.map(curr => (
                        <td key={`cih-${curr}`}>



                          <Input
                            type="text"
                            disabled={true}
                            className="text-end"
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
                      <td>Cash from Factory Sales</td>
                      {currencies.map(curr => (
                        <td key={`cfs-${curr}`}>
                          <Input
                            type="text"
                            disabled={true}
                            className="text-end"
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
                      <td>Total A</td>
                      {currencies.map(curr => (
                        <td key={`totalA-${curr}`} className="text-end">
                          {totalA[curr]?.toLocaleString()}
                        </td>
                      ))}
                    </tr>

                    {/* Category Summary */}
                    {/* {["Claim", "Cash Advance", "Supplier Payment"].map(category => (
        <tr key={category}>
          <td>{category}</td>
          {currencies.map(curr => (
            <td key={`${category}-${curr}-cash`} className="text-end">
              {getAmountForCategoryCurrency(category, curr, "").toLocaleString()}
            </td>
          ))}
        </tr>
      ))} */}

                    {["Claim", "Cash Advance", "Supplier Payment"].map(category => (
                      <tr key={category}>
                        <td>{category}</td>
                        {currencies.map(curr => {
                          const method =
                            category === "Cash Withdrawal"
                              ? "Cash"     // only Cash for Cash Withdrawal row
                              : "NonCash"; // exclude Cash everywhere else
                          return (
                            <td key={`${category}-${curr}`} className="text-end">
                              {getAmountForCategoryCurrency(category, curr, method).toLocaleString()}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Total B */}
                    <tr className="table-light fw-bold">
                      <td>Total B</td>
                      {currencies.map(curr => (
                        <td key={`totalB-${curr}`} className="text-end">
                          {totalB[curr]?.toLocaleString()}
                        </td>
                      ))}
                    </tr>

                    <tr className="table-secondary">
                      <th>Mode of payment</th>
                      {currencies.map(curr => (
                        <th key={`totalB-${curr}`} className="text-end">

                        </th>
                      ))}
                    </tr>

                    {buildTable(selectedsummaryRows)}
                  </tbody>
                </table>
                <br />



                <Row>
                  <Col md="6">
                    <h5 className="text-start">Claim Details</h5></Col>
                  <Col md="6">



                  </Col>
                </Row>
                <br />
                <DataTable
                  value={selectedsummaryRows}
                  sortField="curr" sortOrder={1}
                  dataKey="id"
                  responsiveLayout="scroll"
                  paginator
                  rows={access.records || 10}
                >
                  <Column field="claimno" sortable header="Claim#" />
                  <Column field="name" sortable header="Name" />
                  <Column field="suppliername" sortable header="Supplier Name" />
                  <Column field="type" sortable header="Type" />
                  {access.canViewRate && (
                    <Column field="amount" sortable header="Amount"
                      body={(rowData) =>
                        rowData.amount?.toLocaleString('en-US', {
                          style: 'decimal',
                          minimumFractionDigits: 2
                        })
                      }
                      style={{ textAlign: "right" }} />
                  )}
                  <Column field="curr" sortable header="Currency" />
                  <Column field="paymentMethod" sortable header="Mode of Payment" />


                </DataTable>


              </>
            );
          })()}




        </ModalBody>

        <ModalFooter>



          <button type="button" className="btn btn-danger" onClick={() => setConvertModalVisible(false)}>
            <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i> Close
          </button>

        </ModalFooter>
      </Modal>
      <Modal isOpen={showvoucherModal} toggle={togglevoucherModal} size="xl">
        <ModalHeader toggle={togglevoucherModal}>Voucher</ModalHeader>
        <ModalBody>

          {selectedVoucherId && (
            <PaymentVoucher VoucherId={selectedVoucherId} />
          )}
        </ModalBody>
      </Modal>
      <Modal isOpen={historyVisible} toggle={() => setHistoryVisible(false)} size="xl">
        <ModalHeader toggle={() => setHistoryVisible(false)}>
          {historyForType} History
        </ModalHeader>
        <ModalBody>
          <Row form className="align-items-end mb-3">
            <Col sm="4">
              <label>From</label>


              <InputGroup>
                <Flatpickr
                  name="FromDate"
                  id="FromDate"
                  className="form-control d-block"
                  placeholder="dd-mm-yyyy"
                  options={{
                    altInput: true,
                    altFormat: "d-M-Y",
                    dateFormat: "Y-m-d",
                  }}
                  value={historyRange.from}
                  onChange={(e) => setHistoryRange(r => ({ ...r, from: e.value }))}
                  style={{ cursor: "default" }}
                />

              </InputGroup>
            </Col>
            <Col sm="4">
              <label>To</label>
              <InputGroup>
                <Flatpickr
                  name="FromDate"
                  id="FromDate"
                  className="form-control d-block"
                  placeholder="dd-mm-yyyy"
                  options={{
                    altInput: true,
                    altFormat: "d-M-Y",
                    dateFormat: "Y-m-d",
                  }}
                  value={historyRange.to}
                  onChange={(e) => setHistoryRange(r => ({ ...r, to: e.value }))}
                  style={{ cursor: "default" }}
                />

              </InputGroup>
            </Col>
            <Col sm="4">

              <button type="button" className="btn btn-info" onClick={() => {
                const filtered = historyArray.filter(h =>
                  h.type === historyForType &&
                  (!historyRange.from || new Date(h.transactiondate) >= historyRange.from) &&
                  (!historyRange.to || new Date(h.transactiondate) <= historyRange.to)
                );
                setHistoryData(filtered);
              }}>
                <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i> Search</button>

            </Col>
          </Row>

          <DataTable value={historyArray} dataKey="id" responsiveLayout="scroll" paginator rows={access.records || 10}>
            <Column headerStyle={{ textAlign: 'center' }} style={{ textAlign: 'center' }} field="claimno" header="Claim#" />
            <Column headerStyle={{ textAlign: 'center' }} field="date" header="Claim Date" />
            <Column headerStyle={{ textAlign: 'center' }} field="name" header="Applicant Name" />

            <Column headerStyle={{ textAlign: 'center' }} field="dept" header="Applicant Department" />

            <Column headerStyle={{ textAlign: 'center', width: "100px" }} field="suppliername" header="Supplier Name" />
            {access.canViewRate && (
              <Column headerStyle={{ textAlign: 'center' }} field="amount" header="Claim Amount in TC"
                body={(rowData) =>
                  rowData.amount?.toLocaleString('en-US', {
                    style: 'decimal',
                    minimumFractionDigits: 2
                  })
                } style={{ textAlign: 'right' }} />
            )}
            <Column headerStyle={{ textAlign: 'center' }} field="curr" header="Currency" />
            <Column headerStyle={{ textAlign: 'center' }} field="transactiondate" header="Approved Date" />

            <Column
              header="GM"
              body={(r) => <ApproverIndicator approved={r.approvedone} discussed={r.discussedone} />}
            />
            <Column
              header="Director"
              body={(r) => <ApproverIndicator approved={r.approvedtwo} discussed={r.discussedtwo} />}
            />
            {/* <Column header="Remarks"        body={(rowData) => rowData.comment }      /> */}
          </DataTable>
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-danger" onClick={() => setHistoryVisible(false)} ><i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>Close</button>

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
                  ["Trans Currency ", selectedDetail.header?.transactioncurrency],
                  ["HOD", selectedDetail.header?.HOD_Name],
                  ["Supplier", selectedDetail.header?.SupplierName],
                  ["Cost Center", selectedDetail.header?.CostCenter],
                  access?.canViewRate
                    ? [
                      "Claim Amt in TC",
                      <span key="amtintc">
                        {selectedDetail.header?.ClaimAmountInTC?.toLocaleString("en-US", {
                          style: "decimal",
                          minimumFractionDigits: 2,
                        })}
                      </span>,
                    ]
                    : null,
                  ["Payment Mode", selectedDetail.header?.paymentmethodname],
                ].filter(Boolean).map(([label, val], i) => (
                  <Col md="4" key={i} className="form-group row ">
                    <Label className="col-sm-4 col-form-label bold">{label}</Label>
                    <Col sm="8" className="mt-2">: {val}</Col>
                  </Col>
                ))}
              </Row>
              <hr />
              <DataTable value={selectedDetail.details} paginator rows={access.records || 10}>
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
                {(selectedDetail.header?.ClaimCategoryId === 3) && (
                  <Column
                    field="prno"
                    header="PR No"
                    className="text-left"
                    style={{ width: "10%" }}
                    body={actionprBodyTemplate}
                  />
                )}
                <Column headerStyle={{ textAlign: 'center' }} field="claimtype" header="Claim Type" />
                <Column headerStyle={{ textAlign: 'center' }} field="PaymentDescription" header="Claim & Payment Description" />
                {access.canViewRate && (
                  <Column style={{ textAlign: "right" }} field="TotalAmount" header="Amount"
                    body={(rowData) =>
                      rowData.TotalAmount?.toLocaleString('en-US', {
                        style: 'decimal',
                        minimumFractionDigits: 2
                      })
                    } />
                )}
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
          {(selectedDetail?.header?.ClaimCategoryId === 3 || UserData?.roleName === 'Director' || UserData?.RoleName === 'Director') && (
            <button
              type="button"
              className="btn btn-success"

              onClick={handleOpenPaymentHistory}
            >
              <i className="mdi mdi-eye font-size-16 me-2"></i> Payment History
            </button>
          )}

          {!access.loading && access.print && (
            <button
              type="button"
              data-access="print"
              className="btn btn-primary"
              onClick={() => handleDetailsPrint()}
            >
              <i className="mdi mdi-printer font-size-16 me-2"></i> Print
            </button>
          )}

          <button type="button" className="btn btn-danger" onClick={() => setDetailVisible(false)}> <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Close</button>

        </ModalFooter>
      </Modal>

      <Modal isOpen={showPaymentHistoryModal} toggle={togglePaymentHistoryModal} size="xl">
        <ModalHeader toggle={togglePaymentHistoryModal}>Payment History</ModalHeader>
        <ModalBody>
          {selectedpoids && selectedpoids.length > 0 ? (
            <PaymentHistory
              poId={selectedpoids}
            />
          ) : (
            <div>No records found.</div>
          )}
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-danger" onClick={togglePaymentHistoryModal}>Close</button>
        </ModalFooter>
      </Modal>

      {/* PR Details Modal - Reusable */}
      <Modal isOpen={prDetailVisible} toggle={() => setPrDetailVisible(false)} size="xl">
        <ModalHeader toggle={() => setPrDetailVisible(false)}>PR Details</ModalHeader>
        <ModalBody>
          {selectedPRDetail && (
            <>
              {/* Header Section */}
              <Row form>
                {[
                  ["PR No.", selectedPRDetail.Header?.PR_Number],
                  ["PR Type", selectedPRDetail.Header?.prTypeName],
                  ["PR Date", formatDatePR(selectedPRDetail.Header?.PRDate)],
                  ["PM No.", selectedPRDetail.Header?.MemoConcat],
                  ["Supplier", selectedPRDetail.Header?.SupplierName],
                  ["Currency", selectedPRDetail.Header?.currencycode],
                  ["Payment Term", selectedPRDetail.Header?.PaymentTermName],
                  ["Sup. Address", selectedPRDetail.Header?.SupplierAddress],
                  ["Delivery Term", selectedPRDetail.Header?.DeliveryTerm],
                  ["Requestor", selectedPRDetail.Header?.UserName],
                  ["BTG Delivery Address", selectedPRDetail.Header?.BTGDeliveryAddress],
                  ["Sup. Contact", selectedPRDetail.Header?.contact],
                  ["Sup. Email", selectedPRDetail.Header?.Email],
                  ["Projects", selectedPRDetail.Header?.ProjectName],
                  ["PO Reference", selectedPRDetail.Header?.poreference],
                ].map(([label, val], i) => (
                  <Col md="4" key={i} className="form-group row ">
                    <Label className="col-sm-5 col-form-label bold">{label}</Label>
                    <Col sm="7" className="mt-2">: {val || "N/A"}</Col>
                  </Col>
                ))}
              </Row>

              <hr />

              <DataTable value={selectedPRDetail.Details} paginator rows={access.records || 10} footerColumnGroup={
                <ColumnGroup>
                  <Row>
                    <Column footer="GRAND TOTAL" colSpan={6} footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                    <Column footer={<b>{selectedPRDetail.Header?.HeaderDiscountValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} />
                    <Column footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                    <Column footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                    <Column footer={<b>{selectedPRDetail.Header?.HeaderTaxValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} />
                    <Column footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                    <Column footer={<b>{selectedPRDetail.Header?.HeaderVatValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} />
                    <Column footer={<b>{selectedPRDetail.Header?.HeaderNetValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} />
                  </Row>
                </ColumnGroup>
              }>
                <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                <Column field="memo_number" header="PM No." />
                <Column field="ItemName" header="Item Name" />
                <Column field="Qty" header="Qty" body={(row) => row.Qty?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                <Column field="UOMName" header="UOM" />
                <Column field="UnitPrice" header="Unit Price" body={(row) => row.UnitPrice?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                <Column field="DiscountValue" header="Discount" body={(row) => row.DiscountValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                <Column field="taxname" header="Tax" />
                <Column field="TaxPerc" header="Tax %" />
                <Column field="TaxValue" header="Tax Amount" body={(row) => row.TaxValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                <Column field="vatPerc" header="VAT %" />
                <Column field="vatValue" header="VAT Amount" body={(row) => row.vatValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                <Column field="NetTotal" header="Total Amount" body={(row) => row.NetTotal?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
              </DataTable>

              <Row className="mt-3">
                <Col>
                  <Label>PM Remarks</Label>
                  <Card className="p-2 bg-light border">
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {selectedPRDetail.Header?.Memoremarks || "No pm remarks"}
                    </div>
                  </Card>
                </Col>
              </Row>

              <Row className="mt-3">
                <Col>
                  <Label>Remarks</Label>
                  <Card className="p-2 bg-light border">
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {selectedPRDetail.Header?.Remarks || "No remarks"}
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* Attachments table if exists */}
              {selectedPRDetail.Attachment && selectedPRDetail.Attachment.length > 0 && (
                <Row className="mt-3">
                  <DataTable tableStyle={{ width: "60%" }} value={selectedPRDetail.Attachment} paginator rows={access.records || 10}>
                    <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                    <Column field="AttachmentName" header="Attachment" />
                  </DataTable>
                </Row>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-danger" onClick={() => setPrDetailVisible(false)}>
            Close
          </button>
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
                  //   <Label className="col-sm-5 col-form-label bold">{label}</Label>
                  //   <Col sm="7" className="mt-2">: {val}</Col>
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

              <DataTable value={selectedPODetail.Requisition} paginator rows={access.records || 10}>
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

      {/* PV View Modal */}
      <Modal isOpen={pvViewModalVisible} className="modal-fullscreen" toggle={() => setPvViewModalVisible(false)}>
        <ModalHeader toggle={() => setPvViewModalVisible(false)}>
          <div className="d-flex justify-content-between align-items-center w-100">
            <span>Payment Summary</span>
          </div>
        </ModalHeader>
        <ModalBody>
          {pvViewGroup && (
            <>
              <div className="alert alert-primary">
                <strong>Payment Plan Date:</strong> {pvViewGroup.PaymentPlanDate} /
                <strong> PPP No:</strong> {pvViewGroup.PaymentNo}
              </div>
              <PaymentSummaryTable claims={pvViewGroup.rows} approvedata={pvViewGroup} onRefresh={() => load()} handlePRClick={handlePRClick} />
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-danger" onClick={() => setPvViewModalVisible(false)}>
            <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i> Close
          </button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};

import 'flatpickr/dist/themes/material_green.css'; // Or your preferred theme

const ApprovalTable = ({
  data,
  handleShowDetails,
  ApproverIndicator,
  selectedRows,
  setSelectedRows,
  handleCheckboxChange,
  setData,
  access,
  type, handleVoucherClick, ApproverGridIndicator,
  modeOfPaymentOptions, bankOptions
}) => {
  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    claimno: { value: null, matchMode: FilterMatchMode.CONTAINS },
    type: { value: null, matchMode: FilterMatchMode.EQUALS },
    date: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    dept: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    suppliername: { value: null, matchMode: FilterMatchMode.CONTAINS },
    amount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    curr: { value: null, matchMode: FilterMatchMode.EQUALS },
    ModeOfPaymentId: { value: null, matchMode: FilterMatchMode.EQUALS },
    bankName: { value: null, matchMode: FilterMatchMode.EQUALS },
    paymentDateText: { value: null, matchMode: FilterMatchMode.CONTAINS },
    approvedone: { value: null, matchMode: FilterMatchMode.EQUALS },
    approvedtwo: { value: null, matchMode: FilterMatchMode.EQUALS },
    approvedthree: { value: null, matchMode: FilterMatchMode.EQUALS },
    voucherno: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const [globalFilterValue, setGlobalFilterValue] = useState('');

  const deptOptions = [...new Set(data.map(d => d.dept))].map(d => ({
    label: d,
    value: d
  }));


  const [tableData, setTableData] = useState([]);


  useEffect(() => {
    // Moved to parent PPP component
  }, []);

  const onGlobalFilterChange = (e) => {
    const val = e.target.value;
    setFilters({ ...filters, global: { value: val, matchMode: FilterMatchMode.CONTAINS } });
    setGlobalFilterValue(val);
  };

  useEffect(() => {
    setSelectedRows(prevSelected =>
      prevSelected.map(sel => data.find(d => d.id === sel.id) || sel)
    );
  }, [data]);

  const renderHeader = () => (
    <div className="row align-items-center g-3 clear-spa">
      <div className="col-12 col-lg-6">
        <Button className="btn btn-danger btn-label">
          <i className="mdi mdi-filter-off label-icon" /> Clear
        </Button>
      </div>
      <div className="col-12 col-lg-3 text-end" />
      <div className="col-12 col-lg-3">
        <input
          className="form-control"
          type="text"
          placeholder="Keyword Search"
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
        />
      </div>
    </div>
  );

  const updateClaimField = (editedRowId, field, value, summaryId) => {

    const newValue =
      field === "paymentDate" && typeof value === "string"
        ? new Date(value)
        : value;

    // ✅ IDs of rows in the same summary accordion that are selected (Type-safe coercion & Case-agnostic)
    const selectedIdsInSameGroup = selectedRows
      .filter(r => Number(r.SummaryId ?? r.summaryId) === Number(summaryId))
      .map(r => Number(r.id));

    const isRowSelected = selectedIdsInSameGroup.includes(Number(editedRowId));

    setData(prevData =>
      prevData.map(row => {
        // 🏦 Bank updates → bulk update all selected rows in the same group when edited row is selected
        if (field === "bank") {
          if (isRowSelected && selectedIdsInSameGroup.includes(Number(row.id))) {
            // Skip rows whose Mode of Payment is "Cash" — they should keep "Cash in Hand"
            const isCashRow = modeOfPaymentOptions.find(opt => opt.value === row.ModeOfPaymentId)?.label === "Cash";
            if (isCashRow) return row;
            return { ...row, [field]: newValue };
          }
          if (Number(row.id) === Number(editedRowId)) {
            return { ...row, [field]: newValue };
          }
          return row;
        }

        // 📝 Collective updates (BULK): For Payment Date and ModeOfPaymentId
        if ((field === "paymentDate" || field === "ModeOfPaymentId") && isRowSelected && selectedIdsInSameGroup.includes(Number(row.id))) {
          // Row selected & field is date or MOP → update all selected rows in this group
          return { ...row, [field]: newValue };
        }

        // 🏦 Individual updates (unselected rows)
        if (Number(row.id) === Number(editedRowId)) {
          // Update the edited row regardless of selection status
          return { ...row, [field]: newValue };
        }

        return row;
      })
    );

    setSelectedRows(prevSelected =>
      prevSelected.map(row => {

        if (field === "bank") {
          if (isRowSelected && selectedIdsInSameGroup.includes(Number(row.id))) {
            // Skip rows whose Mode of Payment is "Cash" — they should keep "Cash in Hand"
            const isCashRow = modeOfPaymentOptions.find(opt => opt.value === row.ModeOfPaymentId)?.label === "Cash";
            if (isCashRow) return row;
            return { ...row, [field]: newValue };
          }
          if (Number(row.id) === Number(editedRowId)) {
            return { ...row, [field]: newValue };
          }
          return row;
        }

        if (selectedIdsInSameGroup.includes(Number(editedRowId)) &&
          selectedIdsInSameGroup.includes(Number(row.id))) {
          return { ...row, [field]: newValue };
        }

        return row;
      })
    );

  };



  // const updateClaimField = (editedRowId, field, value) => {
  //   debugger;
  //   const selectedIds = selectedRows.map(row => row.id).filter(id => id !== editedRowId);
  //   const newValue = field === 'paymentDate' && typeof value === 'string' ? new Date(value) : value;

  //   setData(prevData =>
  //     prevData.map(row => {
  //       if (row.type !== type) return row;
  //       if (selectedIds.includes(row.id)) {
  //         return { ...row, [field]: newValue };
  //       }
  //       // For the edited row, update separately below

  //       if (row.id === editedRowId) {
  //         return { ...row, [field]: newValue };
  //       }
  //       return row;
  //     })
  //   );

  //   setSelectedRows(prevSelected =>
  //     prevSelected.map(row => {
  //       if (selectedIds.includes(row.id)) {
  //         return { ...row, [field]: newValue };
  //       }
  //       if (row.id === editedRowId) {
  //         return { ...row, [field]: newValue };
  //       }
  //       return row;
  //     })
  //   );
  // };
  const paymentDateTimeout = useRef(null);
  const clearAccordionRows = () => {
    setData(prev =>
      prev.map(row =>
        row.type === type ? { ...row, bank: null, paymentDate: null } : row
      )
    );
  };

  // const updatePaymentDate = (editedRowId, newDate) => {
  //   if (paymentDateTimeout.current) clearTimeout(paymentDateTimeout.current);

  //   paymentDateTimeout.current = setTimeout(() => {
  //     if (!newDate) return;

  //     const selectedIds = selectedRows.map(row => row.id);
  //     const newValue = new Date(newDate);

  //     setData(prevData =>
  //       prevData.map(row => {
  //         if (selectedIds.includes(row.id)) {
  //           return { ...row, paymentDate: newValue };
  //         }
  //         return row;
  //       })
  //     );

  //     setSelectedRows(prevSelected =>
  //       prevSelected.map(row =>
  //         selectedIds.includes(row.id) ? { ...row, paymentDate: newValue } : row
  //       )
  //     );
  //   }, 300);
  // };


  const actionAckBodyTemplate = (rowData) => {
    const disabled = !access.canViewDetails;

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
          if (!disabled) handleVoucherClick(rowData.voucherid);
        }}
      >
        {rowData.voucherno}
      </span>
    );
  };

  useEffect(() => {
    if (!data || data.length === 0) return;

    const updated = data.map(r => {
      let formattedDate = "";

      if (r.paymentDate) {
        const d = new Date(r.paymentDate);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        formattedDate = `${day}-${month}-${year}`;
      }

      const isCash = modeOfPaymentOptions.find(opt => opt.value === r.ModeOfPaymentId)?.label === "Cash";
      const cashInHandBankId = bankOptions.find(opt => opt.label === "Cash in Hand")?.value;

      return {
        ...r,
        bank: isCash && cashInHandBankId ? cashInHandBankId : r.bank,
        bankName: bankOptions.find(x => x.value === Number(isCash && cashInHandBankId ? cashInHandBankId : r.bank))?.label || "",
        paymentDateText: formattedDate
      };
    });

    setTableData(updated);
  }, [data, bankOptions]);
  //


  const flatpickrInstance = useRef(null);
  return (
    <DataTable
      value={tableData}
      selection={selectedRows}
      onSelectionChange={(e) => setSelectedRows(e.value)}
      paginator
      rows={access.records || 10}
      header={renderHeader()}
      filters={filters}
      globalFilterFields={['claimno', 'type', 'date', 'name', 'dept',
        'suppliername', 'amount', 'curr', 'paymentMethod',
        'bankName', 'paymentDateText', 'voucherno']}
      dataKey="id"
      responsiveLayout="scroll"
    >
      <Column
        header="S.No"
        body={(rowData, { rowIndex }) => rowIndex + 1}
        style={{ textAlign: 'center' }}
      />
      {/* <Column field="claimno" header="Claim #"  /> */}
      <Column
        header="Claim #"
        body={(rowData) => {
          const disabled = !access.canViewDetails;
          return (
            <span
              id={`tt-${rowData.claimno}`}
              style={{
                color: disabled ? 'gray' : '#007bff',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1
              }}
              onClick={() => {
                if (!disabled) handleShowDetails(rowData);
              }}
              data-access="viewdetails"
            >
              {rowData.claimno}
              <Tooltip content="View Details" direction="top">
                <span></span>
              </Tooltip>
            </span>
          );
        }}
      />
      <Column field="type" header="Claim Category" />
      <Column field="date" header="Claim Date" />
      <Column field="name" header="Applicant" />
      <Column
        field="dept"
        header="Applicant Department"

        filterElement={(opts) => (
          <Dropdown
            value={opts.value}
            options={deptOptions}
            onChange={(e) => opts.filterCallback(e.value, opts.index)}
            placeholder="All Depts"
            className="p-column-filter"
          />
        )}
      />
      <Column field="suppliername" header="Supplier Name" />
      {access.canViewRate && (
        <Column field="amount" header="Claim Amount in TC"
          body={(rowData) =>
            rowData.amount?.toLocaleString('en-US', {
              style: 'decimal',
              minimumFractionDigits: 2
            })
          }
          style={{ width: "6%", textAlign: 'center' }} />
      )}
      <Column field="curr" header="Currency" style={{ width: "6%" }} />
      {/* <Column
        header="Details"
        body={(rowData) => (
          <span
            id={`tt-${rowData.claimno}`}
            style={{ color: '#007bff', cursor: 'pointer' }}
            onClick={() => handleShowDetails(rowData)}
          >
            Details
            <Tooltip content="View Details" direction="top">
              <span></span>
            </Tooltip>
          </span>
        )}
      /> */}
      <Column
        className="text-center"
        style={{ width: "5%" }}
        header="GM"
        body={(r) => <ApproverGridIndicator approved={r.approvedone} discussed={r.discussedone} />}
      />
      <Column
        className="text-center"
        style={{ width: "5%" }}
        header="Director"
        body={(r) => <ApproverGridIndicator approved={r.approvedtwo} discussed={r.discussedtwo} />}
      />


      <Column header="PV" field="voucherno" showFilterMatchModes={false} body={actionAckBodyTemplate} className="text-center" />

      {/* ✅ Mode of Payment */}
      <Column
        field="ModeOfPaymentId"
        header="Mode Of Payment"
        body={(rowData) => {
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Select
                options={modeOfPaymentOptions}
                value={modeOfPaymentOptions.find(opt => opt.value === rowData.ModeOfPaymentId) || null}
                onChange={(selected) => {
                  const newMopId = selected?.value || null;
                  updateClaimField(rowData.id, "ModeOfPaymentId", newMopId, rowData.SummaryId);

                  // 🤖 If changed to Cash, auto-set bank to Cash in Hand
                  const isNowCash = selected?.label === "Cash";
                  if (isNowCash) {
                    const cihBank = bankOptions.find(opt => opt.label === "Cash in Hand");
                    if (cihBank) {
                      updateClaimField(rowData.id, "bank", cihBank.value, rowData.SummaryId);
                    }
                  }
                }}
                classNamePrefix="select"
                menuPortalTarget={document.body}
                styles={{
                  control: (base) => ({ ...base, minWidth: '150px' }),
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                }}
              />
            </div>
          );
        }}
      />

      {/* ✅ Select Bank */}
      <Column
        style={{ width: "40%" }}
        header="Bank"
        body={(rowData) => {
          const isCash =
            modeOfPaymentOptions.find(
              (option) => option.value === rowData.ModeOfPaymentId
            )?.label === "Cash";

          return (
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >

              <Select
                name="bank"
                options={
                  modeOfPaymentOptions.find(opt => opt.value === rowData.ModeOfPaymentId)?.label?.toLowerCase().includes("contra")
                    ? bankOptions.filter(opt => opt.label.toLowerCase().includes("contra") && opt.label.toLowerCase().includes("recievable"))
                    : bankOptions
                }
                placeholder="Select"
                isClearable
                value={
                  isCash
                    ? (bankOptions.find(opt => opt.label === "Cash in Hand") || null)
                    : (bankOptions.find(opt => opt.value === Number(rowData.bank)) || null)
                }
                onChange={(selected) => {
                  updateClaimField(rowData.id, "bank", selected?.value || null, rowData.SummaryId)
                }}
                isDisabled={isCash}
                menuPortalTarget={document.body}
                styles={{
                  control: (base) => ({
                    ...base,
                    minWidth: '250px', // ✅ dropdown width
                  }),
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                }}
              />
            </div>
          );
        }}
      />

      {/*<Column
  style={{ width: "10%" }}
  header="Payment Date"
  selectionMode={null} // prevent DataTable selection
  body={(rowData) => (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
    <Flatpickr
        key={`${rowData.id}-${rowData.paymentDate ?? ""}`}
        name="paymentDate"
        className="form-control d-block"
        placeholder="dd-mm-yyyy"
        value={rowData.paymentDate || new Date()}
        options={{
          altInput: true,
          altFormat: "d-M-Y",
          dateFormat: "Y-m-d",
          defaultDate: rowData.paymentDate || new Date(),
          appendTo: document.body

        }}
        onOpen={(dates, str, instance) => {
          // force open in case PrimeReact closes it
          setTimeout(() => instance.open(), 0);
        }}
        onChange={(_, dateStr) => {
          updateClaimField(
            rowData.id,
            "paymentDate",
            dateStr,
            rowData.SummaryId
          );
        }}
      />
    </div>
  )}
/> */}

      <Column
        style={{ width: "10%" }}
        header="Payment Date"
        body={(rowData) => {
          const formatDate = (date) => {
            if (!date) return "";
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
          };

          return (
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <input
                type="date"
                className="form-control"
                value={formatDate(rowData.paymentDate)}
                onChange={(e) => {
                  const newDate = e.target.value; // YYYY-MM-DD

                  setData((prevData) => {
                    let updated = [...prevData];

                    // ✅ If this row is selected, update all selected rows
                    if (selectedRows.some((r) => r.id === rowData.id)) {
                      const selectedIds = selectedRows.map((r) => r.id);
                      updated = updated.map((row) =>
                        selectedIds.includes(row.id)
                          ? { ...row, paymentDate: newDate }
                          : row
                      );
                    } else {
                      // ✅ Otherwise, update only the current row
                      const index = updated.findIndex((r) => r.id === rowData.id);
                      if (index !== -1) {
                        updated[index] = { ...updated[index], paymentDate: newDate };
                      }
                    }

                    return updated;
                  });

                  // ✅ Sync selectedRows too
                  setSelectedRows((prevSelected) =>
                    prevSelected.map((row) =>
                      row.id === rowData.id || prevSelected.some(r => r.id === rowData.id)
                        ? { ...row, paymentDate: newDate }
                        : row
                    )
                  );
                }}
              />
            </div>
          );
        }}
      />




      {/* <Column
        style={{ width: "10%" }}
        header="Payment Date"
   
        body={(rowData) => (
          <InputGroup>


 

            <Flatpickr
             
              name="paymentDate"
              className="form-control"
              placeholder="dd-mm-yyyy"
              value={rowData.paymentDate ? new Date(rowData.paymentDate) : null}
              options={{
                altInput: true,
                                                                                        altFormat: "d-M-Y",
                                                                                        dateFormat: "Y-m-d",
                                                                                     
              }}

              onChange={(selectedDates) => {
                if (!selectedDates.length) return;
               
                const newDate = selectedDates[0];
             
                setData(prevData => {
                  const updated = [...prevData];
                  const index = updated.findIndex(row => row.id === rowData.id);
                  if (index !== -1) {
                    updated[index] = { ...updated[index], paymentDate: newDate };
                  }
                  return updated;
                });
             
                setSelectedRows(prevSelected => {
                  const updated = [...prevSelected];
                  const index = updated.findIndex(row => row.id === rowData.id);
                  if (index !== -1) {
                    updated[index] = { ...updated[index], paymentDate: newDate };
                  }
                  return updated;
                });
              }}

         

            />
          </InputGroup>
        )}
      />  */}
      <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
    </DataTable>
  );
};


export default PPP;