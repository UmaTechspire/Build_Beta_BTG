import {
  Col,

  Row,
  Label, Input, InputGroup
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb"
import { Dialog } from 'primereact/dialog';
import { Calendar } from 'primereact/calendar';
import { Tag } from "primereact/tag";
import React, { useState, useRef, useEffect } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Table } from 'reactstrap';
import { FilterOperator } from 'primereact/api';
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
import { ColumnGroup } from 'primereact/columngroup';
import { FilterMatchMode } from "primereact/api";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { Badge } from 'primereact/badge';
import { Checkbox } from 'primereact/checkbox';
import { RadioButton } from 'primereact/radiobutton';
import {
  DownloadFileById, GetPaymentPlandetails, SavePaymentPlan, GetPaymentSummaryseqno, ClaimAndPaymentGetById,
  GetPRNoBySupplierAndCurrency, GetByIdPurchaseOrder, GetByIdPurchaseRequisition,
  GetPONOAutoComplete, GetGRNsByPO
} from "common/data/mastersapi";
import { roundByCurrency } from "common/currencyUtils";
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import useAccess from "../../common/access/useAccess";

const getUserDetails = () => {
  if (localStorage.getItem("authUser")) {
    const obj = JSON.parse(localStorage.getItem("authUser"))
    return obj;
  }
}

const Paymentplanapproval = ({ selectedType, setSelectedType }) => {

  const user = getUserDetails();
  const userId = user?.u_id || 1;
  const orgId = user?.orgId || 1;
  const branchId = user?.branchId || 1;

  const types = [
    "Claim Approval",
    "Payment Plan",
    "PPP",
    "PPP Approval"
  ];

  const { access, applyAccessUI } = useAccess("Claim", "Master Payment Plan");
  const canViewDetails = !access.loading && access.canViewDetails;

  useEffect(() => {
    if (!access.loading) {
      applyAccessUI();
    }
  }, [access, applyAccessUI]);

  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyRange, setHistoryRange] = useState({ from: null, to: null });
  const [historyForType, setHistoryForType] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedPRDetail, setSelectedPRDetail] = useState(null);

  // Blanket PO Details State
  const [blanketPoViewVisible, setBlanketPoViewVisible] = useState(false);
  const [blanketPoViewData, setBlanketPoViewData] = useState(null);
  const [blanketPoLoading, setBlanketPoLoading] = useState(false);



  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [convertFromDate, setConvertFromDate] = useState(null);
  const [convertToDate, setConvertToDate] = useState(null);
  const [selectedPSRows, setselectedPSRows] = useState([]);

  const currencies = ["IDR", "SGD", "USD", "MYR", "AUD"];
  const [cashInHand, setCashInHand] = React.useState({
    CNY: 0, USD: 0, SGD: 0, IDR: 0, MYR: 0
  });
  const [cashFromSales, setCashFromSales] = React.useState({
    CNY: 0, USD: 0, SGD: 0, IDR: 0, MYR: 0
  });

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

  const [previewUrl, setPreviewUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [claims, setclaims] = useState([[]]);
  const [Seqno, setSeqno] = useState("");
  const [historyArray, sethistoryArray] = useState([
    { transactiondate: "26-Jun-25", approvedone: 1, discussedone: 0, approvedtwo: 1, discussedtwo: 0, comment: "", type: "CLAIM", id: 1, claimno: "CLM0000025", date: "23‑Jun‑25", name: "Sandy", dept: "Sales & Marketing", amount: "100.00", curr: "SGD", transactions: "Txn A" },
    { transactiondate: "26-Jun-25", approvedone: 1, discussedone: 0, approvedtwo: 0, discussedtwo: 0, comment: "", type: "CLAIM", id: 2, claimno: "CLM0000171", date: "26‑Jun‑25", name: "Lysa", dept: "Sales & Marketing", amount: "236.00", curr: "USD", transactions: "Txn B" },
    { transactiondate: "26-Jun-25", approvedone: 1, discussedone: 0, approvedtwo: 0, discussedtwo: 0, comment: "", type: "CASH ADVANCE", id: 3, claimno: "CLM0000036", date: "26‑Jun‑25", name: "Mery", dept: "Finance", amount: "122.00", curr: "IDR", transactions: "Txn C" },
    { transactiondate: "26-Jun-25", approvedone: 0, discussedone: 1, approvedtwo: 0, discussedtwo: 0, comment: "", type: "CASH ADVANCE", id: 4, claimno: "CLM0000057", date: "26‑Jun‑25", name: "Anwar", dept: "Operations", amount: "33.30", curr: "SGD", transactions: "Txn D" },
    { transactiondate: "26-Jun-25", approvedone: 0, discussedone: 1, approvedtwo: 0, discussedtwo: 1, comment: "", type: "SUPPLIER PAYMENT", id: 5, claimno: "CLM0000122", date: "25‑Jun‑25", name: "Shafiq", dept: "HR", amount: "376.80", curr: "MYR", transactions: "Txn E" },
    { transactiondate: "26-Jun-25", approvedone: 0, discussedone: 1, approvedtwo: 1, discussedtwo: 0, comment: "", type: "SUPPLIER PAYMENT", id: 6, claimno: "CLM0000132", date: "26‑Jun‑25", name: "Sandy", dept: "Sales & Marketing", amount: "433.00", curr: "IDR", transactions: "Txn F" }
  ]);
  const [prDetailVisible, setPrDetailVisible] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [action1, setAction1] = useState({});
  const [action2, setAction2] = useState({});
  const [Claimheader, setClaimheader] = useState({ alravailable: 0 });
  const handleDiscuss = (rowData) => {
    setSelectedClaim(rowData);
    setShowModal(true);
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
  const getSummaryByTypeAndCurrency = rows => {
    const map = {};
    rows.forEach(r => {
      const t = r.type, c = r.curr;
      const a = parseFloat(String(r.amount || 0).toString().replace(/,/g, ""));
      map[t] = map[t] || {};
      map[t][c] = (map[t][c] || 0) + a;
    });
    return map;
  };

  const getUniqueCurrencies = rows => {
    return Array.from(new Set(rows.map(r => r.curr)));
  };
  const sel = claims.filter(c => selectedRows.includes(c.id));

  const summary = getSummaryByTypeAndCurrency(sel);
  const handleConvertClick = async () => {
    if (selectedRows.length === 0) {
      Swal.fire("Error", "Please select at least one record", "error");
      return;
    }

    await GetSeqNo();

    if (Claimheader.alravailable == 1) {
      setConvertFromDate(Claimheader.FromDate ? new Date(Claimheader.FromDate) : null);
      setConvertToDate(Claimheader.ToDate ? new Date(Claimheader.ToDate) : null);
    } else {
      setConvertFromDate(null);
      setConvertToDate(null);
    }
    setConvertModalVisible(true);
  };
  const handleConvertSubmit = async (type) => {
    if (!convertFromDate || !convertToDate) {
      Swal.fire("Warning", "Please select both dates.", "warning");
      return;
    }
    if (selectedRows == null || selectedRows == undefined || selectedRows.length == 0) {
      Swal.fire("Warning", "Claim record is not available.", "warning");
      return;
    }

    if (type === 1) {
      Swal.fire({
        title: "Are you sure?",
        text: "Click Yes to confirm the Submit",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes",
        cancelButtonText: "No",
      }).then((result) => {
        if (result.isConfirmed) {
          processSubmit(type);
        }
      });
    } else {
      processSubmit(type);
    }
  };

  const processSubmit = async (type) => {



    const totalA = (parseFloat(cashInHand?.IDR) || 0) + (parseFloat(cashFromSales?.IDR) || 0);

    const selectedCurrencies = Array.from(new Set(selectedRows.map(r => r.curr)));
    const categories = ["Claim", "Cash Advance", "Supplier Payment"];
    const summary = [];

    const cleanAmount = (val) => parseFloat(String(val || "0").replace(/,/g, "")) || 0;

    const findSampleRow = (category, currency, method) =>
      selectedRows.find(r =>

        r.curr === currency &&
        (r.paymentMethod || "").toLowerCase() === method.toLowerCase()
      );

    const getAmount = (category, currency, method) =>
      selectedRows
        .filter(r =>

          r.curr === currency &&
          (r.paymentMethod || "").toLowerCase() === method.toLowerCase()
        )
        .reduce((sum, r) => sum + cleanAmount(r.amount), 0);

    const getIDRAmount = (category, currency, method) =>
      selectedRows
        .filter(r =>

          r.curr === currency &&
          (r.paymentMethod || "").toLowerCase() === method.toLowerCase()
        )
        .reduce((sum, r) => {
          const amt = cleanAmount(r.amount);
          const rate = parseFloat(r.exchangerate || 1);
          const converted = currency === 'IDR' ? amt : amt * rate;
          return sum + Math.round(converted);
        }, 0);

    categories.forEach(category => {
      let categoryTotalIDR = 0;

      selectedCurrencies.forEach(currency => {
        const amount = getAmount(category, currency, "Cash");
        const converted = getIDRAmount(category, currency, "Cash");
        categoryTotalIDR += converted;

        const sampleRow = findSampleRow(category, currency, "Cash");
        const currencyId = sampleRow?.currencyid || null;
        const typeId = sampleRow?.typeid || null;

        summary.push({
          Category: category,
          Currency: currency,
          Amount: amount == null || amount == undefined ? 0 : amount,
          Conversion: `${currency} → IDR`,
          ConvertedToIDR: converted,
          CurrencyId: currencyId == undefined || currencyId == null ? 0 : currencyId,
          TypeId: category == "Cash" ? 1 : category == "Cash Advance" ? 2 : 3
        });
      });

      summary.push({
        Category: category,
        Currency: "ALL",
        Amount: 0,
        Conversion: "Total in IDR",
        ConvertedToIDR: categoryTotalIDR,
        CurrencyId: 0,
        TypeId: category == "Cash" ? 1 : category == "Cash Advance" ? 2 : 3
      });
    });

    // Total B
    const totalB_IDR = summary
      .filter(r => r.Conversion === "Total in IDR" && categories.includes(r.Category))
      .reduce((sum, r) => sum + r.ConvertedToIDR, 0);

    summary.push({
      Category: "Total B",
      Currency: "ALL",
      Amount: 0,
      Conversion: "Total in IDR",
      ConvertedToIDR: totalB_IDR,
      CurrencyId: 0,
      TypeId: 0
    });

    // Cash Needed
    summary.push({
      Category: "Cash Needed (B - A)",
      Currency: "IDR",
      Amount: 0,
      Conversion: "Cash Gap",
      ConvertedToIDR: totalB_IDR - totalA,
      CurrencyId: 0,
      TypeId: 0
    });

    // Bank Payment
    let bankTotalIDR = 0;

    selectedCurrencies.forEach(currency => {
      const amount = getAmount("Bank Payment", currency, "Bank Transfer");
      const converted = getIDRAmount("Bank Payment", currency, "Bank Transfer");
      bankTotalIDR += converted;

      const sampleRow = findSampleRow("Bank Payment", currency, "Bank Transfer");
      const currencyId = sampleRow?.currencyid || null;
      const typeId = sampleRow?.typeid || 4; // Bank Payment default TypeId = 4

      summary.push({
        Category: "Bank Payment",
        Currency: currency,
        Amount: amount == null || amount == undefined ? 0 : amount,
        Conversion: `${currency} → IDR`,
        ConvertedToIDR: converted,
        CurrencyId: currencyId == undefined || currencyId == null ? 0 : currencyId,
        TypeId: typeId,

      });
    });

    summary.push({
      Category: "Bank Payment",
      Currency: "ALL",
      Amount: 0,
      Conversion: "Total in IDR",
      ConvertedToIDR: bankTotalIDR,
      CurrencyId: 0,
      TypeId: 0
    });


    const Summarypayload = {
      header: {
        FromDate: convertFromDate
          ? formatDateToDateOnly(convertFromDate)
          : null,

        ToDate: convertToDate
          ? formatDateToDateOnly(convertToDate)
          : null,
        CashInHand: totalA,
        TotalInHandCash: totalA,
        CashFromSalesAtFactory: 0,
        CashNeeded: totalB_IDR - totalA,
        IsSubmitted: type,
        CashInHands: { ...cashInHand },
        CashFromSales: { ...cashFromSales },

        userId: userId,
        orgid: orgId,
        branchid: branchId,
        seqno: Seqno,
        PaymentId: Claimheader?.SummaryId
      },
      details: summary
    };

    const selectedData = claims.filter(c =>
      selectedRows.some(row => row.id === c.id)
    );

    // const selectedData = claims.filter(c => selectedRows.includes(c.id));

    const payload = {
      approve: {
        approve: selectedData.map(c => ({
          claimid: c.id,
          ispaymentgenerated: true,
          remarks: c.comment || ""
        })),
        userId: userId,
        orgid: orgId,
        branchid: branchId,
        summary: Summarypayload
      }
    };


    const result = await SavePaymentPlan(payload);
    if (result.status) {
      // Swal.fire("success", "Successfully converted to PPP!", "success");

      load();
      setConvertFromDate(null);
      setConvertToDate(null);
      setSeqno("");
      setCashInHand({
        CNY: 0,
        USD: 0,
        SGD: 0,
        IDR: 0,
        MYR: 0,
      });
      setCashFromSales({
        CNY: 0,
        USD: 0,
        SGD: 0,
        IDR: 0,
        MYR: 0,
      });
      if (type == 1) {
        Swal.fire("Submitted!", "Conversion to PPP has been submitted.", "success");
      }
      else {
        Swal.fire("Saved!", "Conversion to PPP has been saved.", "success");
      }
      // const updated = await GetPaymentPlandetails();
      // setclaims(updated.data);
      setSelectedRows([]);
    } else {
      Swal.fire("error", result.message, "error");

    }
    console.log("✅ Final Payload with CurrencyId & TypeId:", payload);


    setConvertModalVisible(false);
  };


  function formatDateToDateOnly(datetime) {
    if (!datetime) return null;
    const date = new Date(datetime);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  const load = async () => {
    const res = await GetPaymentPlandetails(1, orgId, branchId, userId);
    if (res.status) {


      const header = res.data.header;
      setClaimheader(header);
      setclaims(res.data.details);




      if (header?.alravailable === 1) {

        const autoSelected = res.data.details.filter(
          (x) => x.isPaymentPlanSubmmitted === 1
        );
        setSelectedRows(autoSelected);
      }


      if (header?.alravailable === 1) {
        // Skip GetPaymentSummaryseqno() and bind header values
        setSeqno(header.PaymentNo); // Set PPP No
        setCashInHand({
          CNY: header.InHand_CNY || 0,
          USD: header.InHand_USD || 0,
          SGD: header.InHand_SGD || 0,
          IDR: header.InHand_IDR || 0,
          MYR: header.InHand_MYR || 0,
        });
        setCashFromSales({
          CNY: header.Sales_CNY || 0,
          USD: header.Sales_USD || 0,
          SGD: header.Sales_SGD || 0,
          IDR: header.Sales_IDR || 0,
          MYR: header.Sales_MYR || 0,
        });

        setConvertFromDate(header.FromDate ? new Date(header.FromDate) : null);
        setConvertToDate(header.ToDate ? new Date(header.ToDate) : null);
      } else {
        // Fetch new sequence number if no active summary exists
        GetSeqNo();
      }

    } else {
      Swal.fire({
        icon: 'error',
        title: 'Initial Load Failed',
        text: res.message || 'Unable to fetch payment plan data.',
      });
    }
  };

  const GetSeqNo = async () => {
    try {
      const user = getUserDetails();
      const res = await GetPaymentSummaryseqno(user?.orgId || 1, user?.branchId || 1, user?.u_id || 1);
      if (res.status && res.data) {
        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        const seq = data.PaymentNo || data.ClaimNo || (typeof data === 'string' ? data : "");
        setSeqno(seq);
      }
    } catch (err) {
      console.error("Error fetching sequence number:", err);
    }
  };
  useEffect(() => {

    const fetchClaimApprovedDetails = async () => {
      const res = await GetPaymentPlandetails(1, orgId, branchId, userId);
      if (res.status) {


        const header = res.data.header;
        setClaimheader(header);
        setclaims(res.data.details);




        if (header?.alravailable === 1) {

          const autoSelected = res.data.details.filter(
            (x) => x.isPaymentPlanSubmmitted === 1
          );
          setSelectedRows(autoSelected);
        }


        if (header?.alravailable === 1) {
          // Skip GetPaymentSummaryseqno() and bind header values
          setSeqno(header.PaymentNo); // Set PPP No
          setCashInHand({
            CNY: header.InHand_CNY || 0,
            USD: header.InHand_USD || 0,
            SGD: header.InHand_SGD || 0,
            IDR: header.InHand_IDR || 0,
            MYR: header.InHand_MYR || 0,
          });
          setCashFromSales({
            CNY: header.Sales_CNY || 0,
            USD: header.Sales_USD || 0,
            SGD: header.Sales_SGD || 0,
            IDR: header.Sales_IDR || 0,
            MYR: header.Sales_MYR || 0,
          });

          setConvertFromDate(header.FromDate ? new Date(header.FromDate) : null);
          setConvertToDate(header.ToDate ? new Date(header.ToDate) : null);
        } else {
          // 🟢 NEW: Fetch Next SeqNo if this is a new PPP
          GetSeqNo();
        }
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


  const handleBlanketPOViewClick = async (rowData) => {
    setBlanketPoLoading(true);
    setBlanketPoViewVisible(true);
    setBlanketPoViewData(null);
    try {
      const blanketPono = String(rowData.pono || "").trim();
      const originalPono = blanketPono.replace(/-\d+$/, "");

      const blanketRes = await GetByIdPurchaseOrder(rowData.poid, orgId, branchId);

      let originalRes = null;
      let originalPoid = null;
      const ponoSearch = await GetPONOAutoComplete(orgId, branchId, originalPono);
      if (ponoSearch?.status && Array.isArray(ponoSearch.data) && ponoSearch.data.length > 0) {
        const matched = ponoSearch.data.find(p => String(p.pono || p.ponumber || "").trim() === originalPono);
        const poid = matched?.poid || matched?.id || ponoSearch.data[0]?.poid || ponoSearch.data[0]?.id;
        if (poid) {
          originalPoid = poid;
          originalRes = await GetByIdPurchaseOrder(poid, orgId, branchId);
        }
      }

      if (!blanketRes?.status) {
        Swal.fire("Error", "Could not load Blanket PO details.", "error");
        setBlanketPoViewVisible(false);
        return;
      }

      const blanketGRNsRes = originalPoid ? await GetGRNsByPO(originalPoid) : null;
      let blanketGRNs = blanketGRNsRes?.status ? blanketGRNsRes.data : [];

      const currencyCode = blanketRes.data?.Header?.currencycode || rowData.CurrencyCode || originalRes?.data?.Header?.currencycode || "IDR";

      blanketGRNs = (blanketGRNs || []).map((row) => {
        const qty = parseFloat(row.Qty) || 0;
        const unitPrice = parseFloat(row.UnitPrice) || 0;
        const discountPerc = parseFloat(row.DiscountPerc) || 0;
        const originalDiscountValue = parseFloat(row.DiscountValue) || 0;
        const poQty = parseFloat(row.POQty) || 0;
        const taxPerc = parseFloat(row.TaxPerc) || 0;
        const vatPerc = parseFloat(row.VatPerc) || 0;

        const subtotal = qty * unitPrice;
        
        let discountValue = 0;
        if (discountPerc > 0) {
          discountValue = roundByCurrency((subtotal * discountPerc) / 100, currencyCode);
        } else if (originalDiscountValue > 0 && poQty > 0) {
          discountValue = roundByCurrency((qty * originalDiscountValue) / poQty, currencyCode);
        }

        const lineAfterDiscount = subtotal - discountValue;
        const taxValue = roundByCurrency((lineAfterDiscount * taxPerc) / 100, currencyCode);
        const vatValue = roundByCurrency((lineAfterDiscount * vatPerc) / 100, currencyCode);

        const netTotal = roundByCurrency((lineAfterDiscount - taxValue) + vatValue, currencyCode);

        return {
          ...row,
          DiscountPerc: discountPerc,
          DiscountAmt: discountValue,
          TaxPerc: taxPerc,
          TaxAmt: taxValue,
          VatPerc: vatPerc,
          VatAmt: vatValue,
          NetTotal: netTotal
        };
      });

      const originalCreatedByName = originalRes?.data?.Header?.createdbyName || originalRes?.data?.Header?.requestorname || "N/A";
      const blanketCreatedByName = rowData?.createdbyName || blanketRes?.data?.Header?.createdbyName || blanketRes?.data?.Header?.requestorname || originalCreatedByName || "N/A";

      setBlanketPoViewData({
        originalPO: originalRes?.status ? originalRes.data : null,
        originalPono,
        originalCreatedByName,
        blanketPO: blanketRes.data,
        blanketPono,
        blanketCreatedByName,
        blanketGRNs,
      });
    } catch (err) {
      console.error("Error loading Blanket PO view:", err);
      Swal.fire("Error", "Failed to load Blanket PO details.", "error");
      setBlanketPoViewVisible(false);
    } finally {
      setBlanketPoLoading(false);
    }
  };

  const actionpoBodyTemplate = (rowData) => {
    const isBlanketPO = rowData.pono && /-\d+$/.test(String(rowData.pono).trim());
    return (
      <span
        style={{ cursor: "pointer", color: "blue", whiteSpace: "nowrap" }}
        className="btn-rounded btn btn-link"
        onClick={() => {
          if (isBlanketPO) {
            handleBlanketPOViewClick(rowData);
          } else {
            handleShowPODetails(rowData);
          }
        }}
      >
        {rowData.pono}
      </span>
    );
  };

  const actionprBodyTemplate = (rowData) => {
    const prNo = rowData.prnumber || rowData.PR_NUMBER;
    if (!prNo || prNo === 'NA') return <span>{prNo || 'NA'}</span>;

    return (
      <span
        style={{ cursor: "pointer", color: "blue" }}
        className="btn-rounded btn btn-link"
        onClick={() => {
          if (rowData.prid) {
            handlePRClick(rowData.prid);
          } else {
            console.warn("No PR ID found for", prNo);
          }
        }}
      >
        {prNo}
      </span>
    );
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
  const handleConvertToPPP = async () => {
    if (selectedRows.length === 0) {

      Swal.fire("Error", "Please select at least one record to convert", "error");


      return;
    }



    const selectedData = claims.filter(c =>
      selectedRows.some(row => row.id === c.id)
    );

    // const selectedData = claims.filter(c => selectedRows.includes(c.id));

    const payload = {
      approve: {
        approve: selectedData.map(c => ({
          claimid: c.id,
          ispaymentgenerated: true,
          remarks: c.comment || ""
        })),
        userId: 1,     // Replace with actual user ID
        orgid: 1,      // Replace with actual org ID
        branchid: 1    // Replace with actual branch ID
      }
    };

    try {
      const result = await SavePaymentPlan(payload);
      if (result.status) {
        Swal.fire("success", "Successfully converted to PPP!", "success");
        load();

        // const updated = await GetPaymentPlandetails();
        // setclaims(updated.data);
        setSelectedRows([]);
      } else {
        alert("Conversion failed.");
      }
    } catch (error) {
      console.error("Error while converting to PPP:", error);
      Swal.fire("error", "An error occurred during the conversion.", "error");

    }
  };

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
  const handleRemoveSelectedRows = async () => {
    if (!selectedPSRows || selectedPSRows.length === 0) {
      Swal.fire("Warning", "Please select at least one row to remove.", "warning");
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: `You are about to remove ${selectedPSRows.length} selected row(s).`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, remove",
    }).then((result) => {
      if (result.isConfirmed) {
        const updatedRows = selectedRows.filter(row => !selectedPSRows.includes(row));
        setSelectedRows(updatedRows);
        setselectedPSRows([]); // clear selection from table
        Swal.fire("Removed!", "Selected rows have been removed.", "success");
      }
    });
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
  const headerTemplate = (type) => (
    <div className="d-flex justify-content-between align-items-center">
      <span>{type}</span>
      {/* <Button
        icon="pi pi-history"
        className="p-button-text"
        onClick={(e) => {
          e.stopPropagation();
          setHistoryForType(type);
          setHistoryVisible(true);
        }}
        tooltip="History" tooltipOptions={{ position: 'bottom' }}
      /> */}
    </div>
  );


  const handleShowDetails = async (row) => {
    debugger;
    const res = await ClaimAndPaymentGetById(row.id, 1, 1);
    if (res.status) {
      let details = res.data?.details || [];

      // Extract unique PO IDs that are valid
      const uniquePOIds = [...new Set(details.map(d => d.poid).filter(id => id && id > 0))];

      if (uniquePOIds.length > 0) {
        // Create a map to store PO ID -> PR Info
        const poToPrMap = {};

        // Fetch PO details for each unique PO
        await Promise.all(uniquePOIds.map(async (poid) => {
          try {
            const poRes = await GetByIdPurchaseOrder(poid, 1, 1);

            if (poRes?.status && poRes.data?.Requisition) {
              const prNumbers = poRes.data.Requisition
                .map(req => req.prnumber)
                .filter(Boolean); // Filter out null/undefined/empty strings

              // Join unique PR numbers
              const prConcat = [...new Set(prNumbers)].join(", ");

              // Also store the first PRID found for clicking purposes
              const firstPrId = poRes.data.Requisition.find(req => req.prid > 0)?.prid;

              poToPrMap[poid] = {
                prnumber: prConcat || "NA",
                prid: firstPrId
              };
            }
          } catch (err) {
            console.error(`Failed to fetch details for PO ${poid}`, err);
          }
        }));

        // Enrich details with PR info
        details = details.map(d => {
          if (d.poid && poToPrMap[d.poid]) {
            return {
              ...d,
              prnumber: poToPrMap[d.poid].prnumber,
              prid: poToPrMap[d.poid].prid
            };
          }
          return { ...d, prnumber: "NA" };
        });
      }

      setSelectedDetail({
        ...res.data,
        details: details
      });
      setDetailVisible(true);

      setPreviewUrl(res.data?.header?.AttachmentPath || "");
      setFileName(res.data?.header?.AttachmentName || "");

    }
    else {
      Swal.fire("Error", "Data is not available", "error");

    }
  };
  const grouped = claims?.reduce((acc, item) => {
    (acc[item.type] = acc[item.type] || []).push(item);
    return acc;
  }, {});

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

          <Breadcrumbs title="Finance" breadcrumbItem=" Master Payment Plan" />

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
              <Col lg="12" md="6">


                <div className="text-end button-items">
                  {/* onClick={handleConvertToPPP } */}
                  <button type="button" className="btn btn-primary" onClick={handleConvertClick} >
                    <i className="bx bx-plus-circle label-icon font-size-16 align-middle me-2"></i> Convert To PPP
                  </button>
                  {/* <button type="button" className="btn btn-warning">
    <i className="bx bx-chat label-icon font-size-16 align-middle me-2"></i> Discuss
  </button> */}
                  <button type="button" className="btn btn-danger" onClick={() => {

                    setConvertFromDate(null);
                    setConvertToDate(null);
                    setSeqno("");
                    setCashInHand({
                      CNY: 0,
                      USD: 0,
                      SGD: 0,
                      IDR: 0,
                      MYR: 0,
                    });
                    setCashFromSales({
                      CNY: 0,
                      USD: 0,
                      SGD: 0,
                      IDR: 0,
                      MYR: 0,
                    });
                    load();
                  }}>
                    <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i> Cancel
                  </button>
                  <button type="button" className="btn btn-secondary">
                    <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Export
                  </button>

                  <button type="button" data-access="print" className="btn btn-primary">
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
                  {Object.entries(grouped).map(([type, rows]) => (
                    <AccordionTab key={type} header={headerTemplate(type)}>
                      <ApprovalTable
                        data={claims.filter(x => x.type == type)}
                        ApproverIndicator={ApproverIndicator}
                        selectedRows={selectedRows}
                        setSelectedRows={setSelectedRows}
                        handleCheckboxChange={handleCheckboxChange}
                        handleShowDetails={handleShowDetails}
                        canViewDetails={canViewDetails}
                        access={access}
                      />
                    </AccordionTab>
                  ))}
                </Accordion>
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
          <Button label="Save" data-access="save" icon="pi pi-check" onClick={handleSaveComment} />
        </div>
      </Dialog>



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
                  {access.canViewRate && (
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
                  )}
                </ColumnGroup>
              }>
                <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                <Column field="memo_number" header="PM No." />
                <Column field="ItemName" header="Item Name" />
                <Column field="Qty" header="Qty" body={(row) => row.Qty?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                <Column field="UOMName" header="UOM" />
                {access.canViewRate && (
                  <Column field="UnitPrice" header="Unit Price" body={(row) => row.UnitPrice?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                )}
                {access.canViewRate && (
                  <Column field="DiscountValue" header="Discount" body={(row) => row.DiscountValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                )}

                <Column field="taxname" header="Tax" />
                {access.canViewRate && (
                  <Column field="TaxPerc" header="Tax %" />
                )}
                {access.canViewRate && (
                  <Column field="TaxValue" header="Tax Amount" body={(row) => row.TaxValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                )}
                {access.canViewRate && (
                  <Column field="vatPerc" header="VAT %" />
                )}
                {access.canViewRate && (
                  <Column field="vatValue" header="VAT Amount" body={(row) => row.vatValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                )}
                {access.canViewRate && (
                  <Column field="NetTotal" header="Total Amount" body={(row) => row.NetTotal?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                )}
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
      <Modal isOpen={convertModalVisible} className="modal-fullscreen" toggle={() => setConvertModalVisible(false)}>

        <ModalHeader toggle={() => setConvertModalVisible(false)}>

          <div className="d-flex justify-content-between align-items-center w-100" >
            <span>Convert to PPP</span>

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
                value={convertFromDate}

                onChange={(d) => setConvertFromDate(d[0] || null)}

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
                value={convertToDate}
                onChange={d => setConvertToDate(d[0] || null)}
              />
            </Col>

            <Col md="4">
              <div className="d-flex justify-content-end align-items-end h-100">
                <button
                  type="button"
                  data-access="save"
                  className="btn btn-success me-2"
                  onClick={() => handleConvertSubmit(0)}
                >
                  <i className="bx bx-check-circle label-icon font-size-16 align-middle me-2"></i>
                  Save
                </button>

                <button
                  type="button"
                  data-access="save"
                  className="btn btn-primary me-2"
                  onClick={() => handleConvertSubmit(1)}
                >
                  <i className="bx bx-check-circle label-icon font-size-16 align-middle me-2"></i>
                  Submit
                </button>


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
              return selectedRows
                .filter(r =>
                  r.type === category &&
                  r.curr === currency // &&
                  // (!method || (r.paymentMethod || '').toLowerCase() === method.toLowerCase())
                )
                .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
            };


            // const getAmountForCategoryCurrency = (category, currency, cashOnly = null) => {
            //   if(cashOnly=="Cash"){
            //     debugger;
            //     return selectedRows
            //     .filter(r =>
            //       r.curr === currency &&
            //         (r.paymentMethod || "").toLowerCase() === "cash"
            //     )
            //     .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
            //   }
            //   else{
            //   return selectedRows
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
            // };.
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
                            className="text-end"
                            value={formatWithCommas(cashInHand[curr] ?? '')}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/,/g, '');

                              // Allow only valid numbers with optional 1 decimal point
                              if (!/^\d*\.?\d*$/.test(raw)) return;

                              setCashInHand({ ...cashInHand, [curr]: raw });
                            }}
                          />



                          {/*          
          <Input
            type="number"
            className="text-end"
            value={cashInHand[curr]}
            onChange={e =>
              setCashInHand({ ...cashInHand, [curr]: e.target.value })
            }
          /> */}
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
                            className="text-end"
                            value={formatWithCommas(cashFromSales[curr] ?? '')}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/,/g, '');

                              // Allow only valid numbers with optional 1 decimal point
                              if (!/^\d*\.?\d*$/.test(raw)) return;

                              setCashFromSales({ ...cashFromSales, [curr]: raw });
                            }}
                          />

                          {/* <Input
            type="number"
            className="text-end"
            value={cashFromSales[curr]}
            onChange={e =>
              setCashFromSales({ ...cashFromSales, [curr]: e.target.value })
            }
          /> */}
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
                  </tbody>
                </table>
                <br />
                <Row>
                  <Col md="6">
                    <h5 className="text-start">Claim Details</h5></Col>
                  <Col md="6">


                    <div className="d-flex justify-content-end align-items-end h-100">

                      <button
                        type="button"
                        className="btn btn-primary me-2"
                        onClick={() => setConvertModalVisible(false)}
                      >
                        <i className="bx bx-plus-circle label-icon font-size-16 align-middle me-2"></i>
                        Add
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger me-2"
                        onClick={handleRemoveSelectedRows}

                      >
                        <i className="bx bx-trash label-icon font-size-16 align-middle me-2"></i>
                        Remove
                      </button>
                    </div>
                  </Col>
                </Row>
                <br />
                <DataTable
                  paginator
                  rows={access.records || 10}
                  sortField="curr" sortOrder={1}
                  value={selectedRows}
                  selection={selectedPSRows}
                  onSelectionChange={(e) => setselectedPSRows(e.value)}
                  dataKey="id"
                  responsiveLayout="scroll"
                >
                  <Column sortable field="claimno" header="Claim#" />
                  <Column sortable field="name" header="Name" />
                  <Column sortable field="type" header="Type" />
                  {access.canViewRate && (
                    <Column sortable field="amount" header="Amount"
                      body={(rowData) =>
                        rowData.amount?.toLocaleString('en-US', {
                          style: 'decimal',
                          minimumFractionDigits: 2
                        })
                      }
                      style={{ textAlign: "right" }} />
                  )}
                  <Column sortable field="curr" header="Currency" />
                  <Column sortable field="paymentMethod" header="Mode of Payment" />
                  <Column sortable selectionMode="multiple" headerStyle={{ width: '3em' }} />


                </DataTable>


              </>
            );
          })()}




        </ModalBody>

        <ModalFooter>

          <button
            type="button"
            data-access="save"
            className="btn btn-success me-2"
            onClick={() => handleConvertSubmit(0)}
          >
            <i className="bx bx-check-circle label-icon font-size-16 align-middle me-2"></i>
            Save
          </button>

          <button
            type="button"
            data-access="save"
            className="btn btn-primary me-2"
            onClick={() => handleConvertSubmit(1)}
          >
            <i className="bx bx-check-circle label-icon font-size-16 align-middle me-2"></i>
            Submit
          </button>


          <button type="button" className="btn btn-danger" onClick={() => setConvertModalVisible(false)}>
            <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i> Close
          </button>

        </ModalFooter>
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
            {access.canViewRate && (
              <Column headerStyle={{ textAlign: 'center' }} field="amount" header="Claim Amount in TC"

                body={(rowData) =>
                  rowData.amount?.toLocaleString('en-US', {
                    style: 'decimal',
                    minimumFractionDigits: 2
                  })
                }

                style={{ textAlign: 'right' }} />
            )}
            <Column headerStyle={{ textAlign: 'center' }} field="curr" header="Currency" />
            <Column field="paymentMethod" header="Mode of Payment" />
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
                  // ["Claim Amt in TC", <span key="amtintc"> {selectedDetail.header?.ClaimAmountInTC?.toLocaleString('en-US', {
                  //   style: 'decimal',
                  //   minimumFractionDigits: 2
                  // })}</span>],
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
                  ["Supplier", selectedDetail.header?.SupplierName],
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
                    field="prnumber"
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
                                    <span style={{ color: "#666" }}>{cleanPR}</span>
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
                  style={{ textAlign: 'right' }}
                  body={(rowData) =>
                    rowData.qty?.toLocaleString("en-US", { minimumFractionDigits: 3 })
                  }

                />
                <Column field="uom" header="UOM" />
                {access.canViewRate && (
                  <Column
                    field="unitprice"
                    header="Unit Price"
                    body={(rowData) =>
                      rowData.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                    }
                    footer={selectedPODetail.Header?.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  />
                )}
                {access.canViewRate && (

                  <Column
                    field="discountvalue"
                    header="Discount"
                    body={(rowData) =>
                      rowData.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                    }
                    footer={selectedPODetail.Header?.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  />
                )}
                {access.canViewRate && (

                  <Column field="taxperc" header="Tax %" />
                )}
                {access.canViewRate && (

                  <Column
                    field="taxvalue"
                    header="Tax Amt"
                    style={{ textAlign: 'right' }}
                    body={(rowData) =>
                      rowData.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                    }
                    footer={<div style={{ textAlign: 'right' }}>{selectedPODetail.Header?.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>}
                  />
                )}
                {access.canViewRate && (

                  <Column field="vatperc" header="VAT %" />
                )}
                {access.canViewRate && (

                  <Column
                    field="vatvalue"
                    header="VAT Amt"
                    style={{ textAlign: 'right' }}
                    body={(rowData) =>
                      rowData.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                    }
                    footer={<div style={{ textAlign: 'right' }}>{selectedPODetail.Header?.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>}
                  />
                )}
                {access.canViewRate && (

                  <Column
                    field="nettotal"
                    header="Total Amt"
                    style={{ textAlign: 'right' }}
                    body={(rowData) =>
                      rowData.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                    }
                    footer={<div style={{ textAlign: 'right' }}><b>{selectedPODetail.Header?.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</b></div>}
                  />
                )}
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

      {/* ===== Blanket / Short Closure PO History Modal ===== */}
      <Modal isOpen={blanketPoViewVisible} toggle={() => setBlanketPoViewVisible(false)} size="xl">
        <ModalHeader toggle={() => setBlanketPoViewVisible(false)}>
          Purchase Order Details
        </ModalHeader>
        <ModalBody style={{ backgroundColor: "#ffffff", padding: "20px 30px" }}>
          {blanketPoLoading ? (
            <div className="text-center py-5">
              <i className="bx bx-loader bx-spin font-size-24 text-primary"></i>
              <p className="mt-2 text-muted">Loading PO details...</p>
            </div>
          ) : blanketPoViewData ? (
            <>
              {/* ====== SECTION 1: ORIGINAL PO ====== */}
              {blanketPoViewData.originalPO ? (
                <>
                  <Row className="mb-3">
                    <Col md={4}>
                      <div className="d-flex mb-2 align-items-center">
                        <span style={{ minWidth: "120px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>PO No.</span>
                        <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {blanketPoViewData.originalPO.Header?.pono || "N/A"}</span>
                      </div>
                      <div className="d-flex mb-2 align-items-center">
                        <span style={{ minWidth: "120px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>PO Value</span>
                        <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {parseFloat(blanketPoViewData.originalPO.Header?.nettotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="d-flex mb-2 align-items-center">
                        <span style={{ minWidth: "120px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>PO Date</span>
                        <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {formatpoDate(blanketPoViewData.originalPO.Header?.podate)}</span>
                      </div>
                      <div className="d-flex mb-2 align-items-center">
                        <span style={{ minWidth: "120px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>Created Date</span>
                        <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {formatpoDate(blanketPoViewData.originalPO.Header?.createddt)}</span>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="d-flex mb-2 align-items-center">
                        <span style={{ minWidth: "120px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>PO Quantity</span>
                        <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {(blanketPoViewData.originalPO.Requisition || []).reduce((s, r) => s + (parseFloat(r.qty) || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
                      </div>
                      <div className="d-flex mb-2 align-items-center">
                        <span style={{ minWidth: "120px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>Created By</span>
                        <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {blanketPoViewData.originalCreatedByName}</span>
                      </div>
                    </Col>
                  </Row>

                  <p style={{ fontWeight: "bold", fontSize: "15px", marginTop: "15px", marginBottom: "10px", color: "#333" }}>Purchase Order Details</p>
                  <div style={{ overflowX: "auto", marginBottom: "25px" }}>
                    <table className="table table-bordered table-sm mb-0" style={{ fontSize: "12px" }}>
                      <thead>
                        <tr>
                          <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>#</th>
                          <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>PR No.</th>
                          <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Item Group</th>
                          <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Item Name</th>
                          <th className="text-end" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Qty</th>
                          <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>UOM</th>
                          <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Unit Price</th>
                          <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Discount</th>
                          <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Tax %</th>
                          <th className="text-end" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Tax Amt</th>
                          <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>VAT %</th>
                          <th className="text-end" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>VAT Amt</th>
                          <th className="text-end" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Total Amt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(blanketPoViewData.originalPO.Requisition || []).map((row, idx) => (
                          <tr key={idx}>
                            <td className="text-center">{idx + 1}</td>
                            <td>{row.prnumber || "N/A"}</td>
                            <td>{row.groupname || ""}</td>
                            <td>{row.itemname || ""}</td>
                            <td className="text-end">{parseFloat(row.qty || 0).toLocaleString("en-US", { minimumFractionDigits: 3 })}</td>
                            <td className="text-center">{row.uom || ""}</td>
                            <td className="text-center">{parseFloat(row.unitprice || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            <td className="text-center">{parseFloat(row.discountvalue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            <td className="text-center">{row.taxperc ?? 0}</td>
                            <td className="text-end">{parseFloat(row.taxvalue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            <td className="text-center">{row.vatperc ?? 0}</td>
                            <td className="text-end">{parseFloat(row.vatvalue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            <td className="text-end" style={{ color: "#ff5a00", fontWeight: "bold" }}>{parseFloat(row.nettotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                        {(blanketPoViewData.originalPO.Requisition || []).length === 0 && (
                          <tr><td colSpan={13} className="text-center text-muted">No items found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-muted mb-3">Original PO (<b>{blanketPoViewData.originalPono}</b>) could not be loaded.</p>
              )}

              {/* ====== SECTION 2: BLANKET PO ====== */}
              <p style={{ fontWeight: "bold", fontSize: "15px", marginTop: "20px", marginBottom: "15px", color: "#333" }}>BlanketPO Details</p>
              <Row className="mb-3">
                <Col md={4}>
                  <div className="d-flex mb-2 align-items-center">
                    <span style={{ minWidth: "140px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>BlanketPO No.</span>
                    <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {blanketPoViewData.blanketPO.Header?.pono || "N/A"}</span>
                  </div>
                  <div className="d-flex mb-2 align-items-center">
                    <span style={{ minWidth: "140px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>BlanketPO Value</span>
                    <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {(blanketPoViewData.blanketGRNs || []).reduce((s, r) => s + (parseFloat(r.NetTotal) || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="d-flex mb-2 align-items-center">
                    <span style={{ minWidth: "140px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>BlanketPO Date</span>
                    <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {formatpoDate(blanketPoViewData.blanketPO.Header?.podate)}</span>
                  </div>
                  <div className="d-flex mb-2 align-items-center">
                    <span style={{ minWidth: "140px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>Created Date</span>
                    <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {formatpoDate(blanketPoViewData.blanketPO.Header?.createddt)}</span>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="d-flex mb-2 align-items-center">
                    <span style={{ minWidth: "160px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>BlanketPO Quantity</span>
                    <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {(blanketPoViewData.blanketPO.Requisition || []).reduce((s, r) => s + (parseFloat(r.qty) || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div className="d-flex mb-2 align-items-center">
                    <span style={{ minWidth: "160px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>Created By</span>
                    <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {blanketPoViewData.blanketCreatedByName}</span>
                  </div>
                </Col>
              </Row>

              <p style={{ fontWeight: "bold", fontSize: "15px", marginTop: "15px", marginBottom: "10px", color: "#333" }}>GRN Details</p>
              <div style={{ overflowX: "auto" }}>
                <table className="table table-bordered table-sm mb-0" style={{ fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Serial No</th>
                      <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>GRN No</th>
                      <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Item Group</th>
                      <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Item Name</th>
                      <th className="text-end" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Qty</th>
                      <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Uom</th>
                      <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Unit Price</th>
                      <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Discount</th>
                      <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Tax %</th>
                      <th className="text-end" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Tax Amt</th>
                      <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>VAT %</th>
                      <th className="text-end" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>VAT Amt</th>
                      <th className="text-end" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Total Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(blanketPoViewData.blanketGRNs || []).map((row, idx) => (
                      <tr key={idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td className="text-center">{row.GRNNo || ""}</td>
                        <td>{row.ItemGroup || ""}</td>
                        <td>{row.ItemName || ""}</td>
                        <td className="text-end">{parseFloat(row.Qty || 0).toLocaleString("en-US", { minimumFractionDigits: 3 })}</td>
                        <td className="text-center">{row.Uom || ""}</td>
                        <td className="text-center">{parseFloat(row.UnitPrice || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                        <td className="text-center">{parseFloat(row.DiscountAmt || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                        <td className="text-center">{row.TaxPerc ?? 0}</td>
                        <td className="text-end">{parseFloat(row.TaxAmt || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                        <td className="text-center">{row.VatPerc ?? 0}</td>
                        <td className="text-end">{parseFloat(row.VatAmt || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                        <td className="text-end" style={{ color: "#ff5a00", fontWeight: "bold" }}>{parseFloat(row.NetTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    {(blanketPoViewData.blanketGRNs || []).length === 0 && (
                      <tr><td colSpan={13} className="text-center text-muted">No items found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-danger" onClick={() => setBlanketPoViewVisible(false)}>
            Close
          </button>
        </ModalFooter>
      </Modal>

    </React.Fragment >
  );
};

const ApprovalTable = ({
  data,
  handleShowDetails,
  ApproverIndicator,
  selectedRows,
  setSelectedRows,
  handleCheckboxChange,
  canViewDetails = false,
  access
}) => {
  const [filters, setFilters] = useState({
    global: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    claimno: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    date: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    name: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    dept: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    curr: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    amount: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
  });
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const onGlobalFilterChange = (e) => {
    const val = e.target.value;
    setFilters({ ...filters, global: { value: val, matchMode: FilterMatchMode.CONTAINS } });
    setGlobalFilterValue(val);
  };

  const deptOptions = [...new Set(data.map(d => d.dept))].map(d => ({ label: d, value: d }));

  const detailTemplate = (rowData) => (
    <div className="p-3">
      <strong>Transactions:</strong> {rowData.transactions}
    </div>
  );

  const renderHeader = () => {
    return (
      <div className="row align-items-center g-3 clear-spa">
        <div className="col-12 col-lg-6">
          <Button
            className="btn btn-danger btn-label"
            onClick={() => {
              setFilters({
                global: {
                  operator: FilterOperator.AND,
                  constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
                },
                claimno: {
                  operator: FilterOperator.AND,
                  constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
                },
                date: {
                  operator: FilterOperator.AND,
                  constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
                },
                name: {
                  operator: FilterOperator.AND,
                  constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
                },
                dept: {
                  operator: FilterOperator.AND,
                  constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
                },
                curr: {
                  operator: FilterOperator.AND,
                  constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
                },
                amount: {
                  operator: FilterOperator.AND,
                  constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
                },
              });
              setGlobalFilterValue('');
            }}
          >
            <i className="mdi mdi-filter-off label-icon" /> Clear
          </Button>
        </div>
        <div className="col-12 col-lg-3 text-end">
          {/* <span className="me-4">  
            <Button
              icon="pi pi-check"
              className={`btn-circle p-button-rounded p-button-success`}
               
            /> Approve</span>
                                    <span className="me-4"><Button
              icon="pi pi-comment"
              className={`btn-circle p-button-rounded  p-button-warning`}
            /> Discuss</span> */}
          {/* <span className="me-1"><Tag value="P" severity={getSeverity("Posted")} /> Posted</span> */}
        </div>
        <div className="col-12 col-lg-3">
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder="Keyword Search"
            className="form-control"
          />
        </div>
      </div>
    );
  };
  const header = renderHeader();

  return (

    <DataTable selectionMode="multiple" dataKey="id" paginator rows={access.records || 10}
      onSelectionChange={(e) => {
        const newSelection = e.value;
        const currentIds = data.map(d => d.id);
        const filtered = selectedRows.filter(row => !currentIds.includes(row.id));

        // Merge and deduplicate by ID
        const updated = [...filtered, ...newSelection].filter(
          (row, index, self) =>
            index === self.findIndex(r => r.id === row.id)
        );

        setSelectedRows(updated);
      }}
      selection={selectedRows}

      value={data} header={header}
      filters={filters} onFilter={(e) => setFilters(e.filters)}
      globalFilterFields={['claimno', 'name', 'dept', 'curr', 'amount']}
      expandedRows={null} rowExpansionTemplate={detailTemplate}
      responsiveLayout="scroll">
      {/* <Column expander style={{ width: '3em' }} /> */}
      <Column
        header="S.No" style={{ textAlign: 'center' }}
        body={(rowData, { rowIndex }) => rowIndex + 1}
      />
      {/* <Column field="claimno" header="Claim#" filter /> */}

      <Column
        header="Claim#"
        field="claimno"
        filter
        body={(rowData) => {
          const disabled = !canViewDetails;
          return (
            <span
              id={`tt-${rowData.claimno}`}
              style={{
                color: disabled ? "gray" : "#007bff",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1
              }}
              data-access="viewdetails"
              onClick={(e) => {
                if (disabled) {
                  return;
                }
                e.stopPropagation();
                handleShowDetails(rowData);
              }}
            >
              {rowData.claimno}
            </span>
          );
        }}
      />

      <Column field="date" header="Claim Date" filter />
      <Column field="name" header="Applicant Name" filter />
      <Column field="dept" header="Applicant Department" filter />
      {access.canViewRate && (
        <Column field="amount" header="Claim Amount in TC"
          body={(rowData) =>
            rowData.amount?.toLocaleString('en-US', {
              style: 'decimal',
              minimumFractionDigits: 2
            })
          }
          filter style={{ textAlign: 'right' }} />
      )}
      <Column field="curr" header="Currency" filter />
      {/* <Column header="Details" body={(rowData) => (
        <span id={`tt-${rowData.claimno}`} style={{color:'#007bff', cursor:'pointer'}} onClick={() => {
            handleShowDetails(rowData);
          }}>
          Details
         
           <Tooltip target={`#tt-${rowData.claimno}`} content={"View Details"} mouseTrack />
        </span>
      )} /> */}

      <Column
        header="GM"
        body={(r) => <ApproverIndicator approved={r.approvedone} discussed={r.discussedone} />}
      />
      <Column
        header="Director"
        body={(r) => <ApproverIndicator approved={r.approvedtwo} discussed={r.discussedtwo} />}
      />
      {/*
<Column
  header="Convert to PPP"
  style={{ textAlign: 'center' }}
  body={(rowData) => (


   
    <Checkbox
     
      checked={rowData.isSelected}
      onChange={(e) => handleCheckboxChange(e, rowData)}
    />
  )}
/> */}
      <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />

    </DataTable>

  );
};

export default Paymentplanapproval;