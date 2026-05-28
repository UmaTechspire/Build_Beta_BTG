import React, { useState, useEffect } from "react";
import {
  Col,
  Row,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  FormGroup,
  Label,
  Input,
  Table,
  Spinner,
  Badge
} from "reactstrap";
import { toast } from "react-toastify";
import axios from "axios";
import { PYTHON_API_URL } from "common/pyapiconfig";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";

import { GetCustomerFilter } from "../FinanceModule/service/financeapi";
import { GetBankList } from "common/data/mastersapi";

// --- IMPORT LOGO ---
import logo from "../../assets/images/logo.png";

// --- HELPER: Number to Words ---
const numberToWords = (amount) => {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const thousands = ["", "Thousand", "Million", "Billion"];

  const toWords = (num) => {
    if (num === 0) return "";
    else if (num < 10) return units[num];
    else if (num < 20) return teens[num - 10];
    else if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + units[num % 10] : "");
    else return units[Math.floor(num / 100)] + " Hundred" + (num % 100 !== 0 ? " " + toWords(num % 100) : "");
  };

  if (amount === 0) return "Zero";

  let str = "";
  let i = 0;

  const parts = Math.abs(amount).toString().split(".");
  let num = parseInt(parts[0]);

  while (num > 0) {
    if (num % 1000 !== 0) {
      str = toWords(num % 1000) + " " + thousands[i] + " " + str;
    }
    num = Math.floor(num / 1000);
    i++;
  }

  return str.trim();
};

// --- HELPER: Date Formatter (dd-MMM-yyyy) ---
const formatDate = (dateInput) => {
  if (!dateInput || dateInput === "N/A") return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return dateInput;

  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
};

const Breadcrumbs = ({ title, breadcrumbItem }) => (
  <div className="page-title-box d-sm-flex align-items-center justify-content-between">
    <h4 className="mb-sm-0 font-size-18">{breadcrumbItem}</h4>
    <div className="page-title-right">
      <ol className="breadcrumb m-0">
        <li className="breadcrumb-item"><a href="/#">{title}</a></li>
        <li className="breadcrumb-item active"><a href="/#">{breadcrumbItem}</a></li>
      </ol>
    </div>
  </div>
);

const VerifyCustomer = () => {
  const [rows, setRows] = useState([]);
  const [bankList, setBankList] = useState([]);
  const [customerList, setCustomerList] = useState([]);

  // Modal States
  const [verifyModal, setVerifyModal] = useState(false);
  const [replyModal, setReplyModal] = useState(false);
  // const [printModal, setPrintModal] = useState(false); // MOVED TO AddBankBook.js
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [globalFilter, setGlobalFilter] = useState("");

  // Verification Form State
  const [verificationData, setVerificationData] = useState({
    taxDeduction: 0,
    bankCharges: 0,
    advancePayment: 0,
    exchangeRate: 1,
    replyMessage: "",
    invoices: []
  });

  const [messageHistory, setMessageHistory] = useState([]);
  const [isEditingVerified, setIsEditingVerified] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("authUser");
    let userId = null;
    let dept = null;

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        userId = parsedUser.id;
        dept = parsedUser.department;
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }

    loadMasterData(userId, dept);
  }, []);

  const loadMasterData = async (userId, dept) => {
    try {
      const banks = await GetBankList(1, 1);
      const customers = await GetCustomerFilter(1, "%");
      setBankList(banks.map(b => ({ value: b.value, label: b.BankName })));
      const custOptions = Array.isArray(customers) ? customers.map(c => ({ value: c.CustomerID, label: c.CustomerName })) : [];
      setCustomerList(custOptions);

      loadPendingList(custOptions, userId, dept);
    } catch (err) { console.error(err); }
  };

  const loadPendingList = async (customers, userId, dept) => {
    try {
      const response = await axios.get(`${PYTHON_API_URL}/AR/get-pending-list`, {
        params: {
          user_id: userId,
          department: dept
        }
      });

      if (response.data?.status === "success") {
        setRows(response.data.data.map(item => {
          const cashAmt = parseFloat(item.cash_amount) || 0;
          const bankAmt = parseFloat(item.bank_amount) || 0;
          const isBankBook = parseInt(item.deposit_bank_id || 0) > 0;
          return {
            ...item,
            receiptDate: item.receipt_date || "N/A",
            notificationDate: new Date().toLocaleDateString(),
            customerNameDisplay: item.CustomerName || customers.find(c => c.value === item.customer_id)?.label || `Cust: ${item.customer_id}`,
            currencyCode: item.CurrencyCode || "IDR",
            isPosted: false,
            entryType: isBankBook ? "Bankbook" : "Cashbook",
            receiptAmount: isBankBook ? (bankAmt || cashAmt) : cashAmt
          };
        }));
      }
    } catch (err) { toast.error("Failed to load list."); }
  };

  const handleVerifyOpen = async (record) => {
    setSelectedRecord(record);
    setInvoiceSearch("");
    setIsEditingVerified(false);
    setVerifyModal(true);
    setLoadingInvoices(true);

    const initialBankCharges = Math.abs(parseFloat(record.bank_charges) || 0);
    const initialTaxDeduction = Math.abs(parseFloat(record.tax_rate) || parseFloat(record.tax_deduction) || 0);
    const initialExchangeRate = parseFloat(record.exchange_rate) || 1;
    const initialAdvance = parseFloat(record.cash_amount) || 0;

    try {
      const res = await axios.get(`${PYTHON_API_URL}/AR/get-outstanding-invoices/${record.customer_id}`, {
        params: { receipt_id: record.receipt_id }
      });

      let invoiceList = [];
      if (res.data && res.data.status === "success") {
        invoiceList = res.data.data.map(inv => {
          const balance = parseFloat(inv.balance_due) || 0;
          const allocated = parseFloat(inv.allocated_here) || 0;
          let pType = "";
          if (allocated > 0) {
            pType = Math.abs(allocated - balance) < 0.01 ? "Full" : "Partial";
          }
          return {
            id: inv.invoice_id,
            invNo: inv.invoice_no,
            type: inv.record_type || "INV",
            date: inv.invoice_date,
            balanceDue: balance,
            paymentType: pType,
            amount: allocated > 0 ? allocated : "",
            selected: inv.is_pre_selected || false
          };
        });
      }

      // 🟢 Calculate already allocated sum from draft to properly initialize advance
      const preAllocatedSum = invoiceList.filter(inv => inv.selected).reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
      const calculatedAdvance = Math.max(0, initialAdvance - preAllocatedSum + initialBankCharges + initialTaxDeduction);

      setVerificationData({
        taxDeduction: initialTaxDeduction,
        bankCharges: initialBankCharges,
        advancePayment: calculatedAdvance,
        exchangeRate: initialExchangeRate,
        replyMessage: "",
        invoices: invoiceList
      });

    } catch (error) {
      console.error("Error fetching invoices", error);
      toast.error("Could not load customer invoices");
      setVerificationData({
        taxDeduction: initialTaxDeduction,
        bankCharges: initialBankCharges,
        advancePayment: 0,
        exchangeRate: initialExchangeRate,
        replyMessage: "",
        invoices: []
      });
    } finally {
      setLoadingInvoices(false);
    }
  };

  // --- HELPERS FOR NUMBER INPUTS ---
  const formatNumber = (num) => {
    if (!num && num !== 0) return "";
    return num.toLocaleString('en-US');
  };

  const parseNumber = (str) => {
    if (!str) return 0;
    return parseFloat(str.replace(/,/g, '')) || 0;
  };

  const handleInvoiceSearch = (e) => {
    const val = e.target.value;
    setInvoiceSearch(val);

    if (val.trim() === "") return;

    // Auto-select exact matches if they aren't already selected
    const updatedInvoices = verificationData.invoices.map(inv => {
      if (inv.invNo.toString().toLowerCase() === val.trim().toLowerCase() && !inv.selected) {
        return {
          ...inv,
          selected: true,
          paymentType: "Full",
          amount: inv.balanceDue
        };
      }
      return inv;
    });

    // Only update state if something changed to avoid unnecessary renders
    const changed = updatedInvoices.some((inv, idx) => inv.selected !== verificationData.invoices[idx].selected);
    if (changed) {
      setVerificationData(prev => ({ ...prev, invoices: updatedInvoices }));
    }
  };

  const handleInvoiceChange = (index, field, value) => {
    const updated = [...verificationData.invoices];
    if (field === "selected") {
      updated[index].selected = value;
      if (value && !updated[index].paymentType) {
        updated[index].paymentType = "Full";
        updated[index].amount = updated[index].balanceDue;
      }
      if (!value) {
        updated[index].paymentType = "";
        updated[index].amount = "";
      }
    }
    else if (field === "paymentType") {
      updated[index].paymentType = value;
      updated[index].selected = true;
      if (value === "Full") {
        updated[index].amount = updated[index].balanceDue;
      } else {
        updated[index].amount = "";
      }
    }
    else if (field === "amount") {
      updated[index].amount = parseNumber(value);
    }
    setVerificationData(prev => ({ ...prev, invoices: updated }));
  };

  const isAllSelected = verificationData.invoices.length > 0 && verificationData.invoices.every(inv => inv.selected);

  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    const updated = verificationData.invoices.map(inv => ({
      ...inv,
      selected: checked,
      paymentType: checked ? "Full" : "",
      amount: checked ? inv.balanceDue : ""
    }));
    setVerificationData(prev => ({ ...prev, invoices: updated }));
  };

  const totalAllocated = verificationData.invoices.filter(inv => inv.selected).reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
  const receiptAmount = selectedRecord ? (selectedRecord.receiptAmount || 0) : 0;

  // Treat bankCharges and taxDeduction as reductions when entered as positive values
  const utilizedAmount = totalAllocated - Math.abs(verificationData.bankCharges) - Math.abs(verificationData.taxDeduction) + verificationData.advancePayment;

  const variance = receiptAmount - utilizedAmount;
  const isValid = Math.abs(variance) < 1;

  const getPayload = () => ({
    customer_id: selectedRecord.customer_id,
    bank_charges: -Math.abs(verificationData.bankCharges),
    tax_deduction: -Math.abs(verificationData.taxDeduction),
    advance_payment: verificationData.advancePayment,
    exchange_rate: verificationData.exchangeRate,
    reply_message: verificationData.replyMessage,
    user_id: JSON.parse(localStorage.getItem("authUser"))?.id || 1,
    allocations: verificationData.invoices
      .filter(inv => inv.selected)
      .map(inv => ({
        invoice_id: inv.id,
        invoice_no: inv.invNo || "",
        payment_type: inv.paymentType || "Partial",
        amount_allocated: parseFloat(String(inv.amount).replace(/,/g, '')) || 0,
        record_type: inv.type || "INV"
      }))
  });

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const payload = getPayload();
      await axios.put(`${PYTHON_API_URL}/AR/save-draft/${selectedRecord.receipt_id}`, payload);
      toast.info("Updated successfully.");
      setRows(prevRows => prevRows.map(row =>
        row.receipt_id === selectedRecord.receipt_id
          ? { ...row, bank_charges: payload.bank_charges, tax_rate: payload.tax_deduction }
          : row
      ));
    } catch (err) { toast.error("Failed to save draft."); } finally { setSavingDraft(false); }
  };

  const handleReplyOpen = async (record) => {
    setSelectedRecord(record);
    setVerificationData(prev => ({ ...prev, replyMessage: "" }));
    setMessageHistory([]);
    setReplyModal(true);
    try {
      const response = await axios.get(`${PYTHON_API_URL}/AR/get-messages/${record.receipt_id}`, {
        params: { role: "Marketing" }
      });
      if (response.data?.status === "success") {
        setMessageHistory(response.data.data);
        // Clear unread count locally
        setRows(prevRows => prevRows.map(row => 
          row.receipt_id === record.receipt_id ? { ...row, unread_count: 0 } : row
        ));
      }
    } catch (err) { console.error("Failed to load history", err); }
  };

  const handleSendReply = async () => {
    if (!verificationData.replyMessage) { toast.warn("Please enter a message."); return; }
    try {
      await axios.post(`${PYTHON_API_URL}/AR/send-message`, {
        receipt_id: selectedRecord.receipt_id,
        sender_role: "Marketing",
        message_text: verificationData.replyMessage
      });
      toast.success("Reply Sent!");
      setReplyModal(false);
      setVerificationData(prev => ({ ...prev, replyMessage: "" }));
    } catch (err) { toast.error("Failed to send reply."); }
  };

  const handlePostVerification = async () => {
    if (!isValid) {
      toast.error(`Amounts do not match! Variance: ${variance.toLocaleString()}`);
      return;
    }
    try {
      await axios.put(`${PYTHON_API_URL}/AR/verify/${selectedRecord.receipt_id}`, getPayload());
      toast.success("Verification Completed! Now Finance can Post.");
      setVerifyModal(false);

      // Refresh list to show "Post" button
      const storedUser = JSON.parse(localStorage.getItem("authUser"));
      loadPendingList(customerList, storedUser?.id, storedUser?.department);
    } catch (err) { toast.error("Failed to post verification."); }
  };


  // --- HELPER: GET BANK NAME ---
  const getBankName = () => {
    if (!selectedRecord) return "";
    const bId = selectedRecord.deposit_bank_id || selectedRecord.bank_id;
    return selectedRecord.bank_name ||
      (bankList.find(b => b.value == bId)?.label) ||
      "";
  };

  // --- PRINT FUNCTIONS (MOVED TO AddBankBook.js) ---
  // const handlePrintPreview = (rowData) => {
  //   setSelectedRecord(rowData);
  //   setPrintModal(true);
  // };

  // const triggerPrint = () => {
  //   const printContent = document.getElementById("receipt-print-section").innerHTML;
  //   const printWindow = window.open("", "_blank");
  //
  //   printWindow.document.write(`
  //       <html>
  //           <head>
  //               <title>Receipt Voucher - ${selectedRecord?.receipt_id}</title>
  //               <base href="${window.location.origin}/" />
  //               <style>
  //                   body { font-family: 'Times New Roman', serif; margin: 0; padding: 20px; }
  //                   .receipt-container { border: 2px solid #1a2c5b; padding: 30px; position: relative; width: 100%; max-width: 1000px; margin: auto; height: 650px; }
  //                   .header { display: flex; align-items: center; border-bottom: 2px solid #1a2c5b; padding-bottom: 10px; margin-bottom: 20px; }
  //                   .logo { width: 120px; margin-right: 25px; }
  //                   .company-details h2 { margin: 0; color: #1a2c5b; font-size: 26px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
  //                   .company-details p { margin: 3px 0; font-size: 13px; color: #333; }
  //                   .receipt-no { position: absolute; top: 30px; right: 30px; font-size: 22px; color: #d92525; font-weight: bold; font-family: monospace; text-align: right; }
  //                   .running-system { font-size: 11px; color: #666; font-style: italic; margin-top: 5px; }
  //                   .receipt-title { text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0 35px 0; color: #1a2c5b; letter-spacing: 2px; text-decoration: underline double; }
  //                   .content-grid { display: grid; grid-template-columns: 180px 15px 1fr; grid-gap: 15px 5px; align-items: baseline; margin-bottom: 30px; }
  //                   .label { font-weight: bold; color: #1a2c5b; font-size: 16px; white-space: nowrap; }
  //                   .colon { font-weight: bold; color: #1a2c5b; font-size: 16px; text-align: center; }
  //                   .value { border-bottom: 1px solid #1a2c5b; padding-left: 10px; font-size: 16px; position: relative; min-height: 24px; color: #000; }
  //                   .slanted-box { border: 1px solid #1a2c5b; transform: skewX(-20deg); padding: 8px; background: #fff; }
  //                   .amount-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; }
  //                   .amount-label { font-weight: bold; color: #1a2c5b; font-size: 16px; margin-right: 15px; }
  //                   .footer { display: flex; justify-content: space-between; margin-top: 50px; align-items: flex-end; }
  //                   .print-meta { margin-top: 40px; text-align: right; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 5px; }
  //               </style>
  //           </head>
  //           <body>
  //               ${printContent}
  //           </body>
  //       </html>
  //     `);
  //   printWindow.document.close();
  //   printWindow.focus();
  //   setTimeout(() => {
  //     printWindow.print();
  //     printWindow.close();
  //   }, 500);
  // };

  const actionBodyTemplate = (rowData) => {
    const isVerified = rowData.pending_verification === 0 || rowData.pending_verification === false;

    return (
      <div className="d-flex justify-content-center gap-2 align-items-center">
        <i 
          className={isVerified ? "mdi mdi-square-edit-outline text-muted" : "bx bx-check-circle text-primary"} 
          style={{ cursor: "pointer", fontSize: "22px", lineHeight: '1' }} 
          title={isVerified ? "Edit/View" : "Verify"} 
          onClick={() => handleVerifyOpen(rowData)}
        ></i>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <i 
            className={`bx ${rowData.unread_count > 0 ? 'bx-chat text-danger' : 'bx-chat text-muted'}`} 
            style={{ cursor: "pointer", fontSize: "22px", lineHeight: '1' }} 
            title={rowData.unread_count > 0 ? `Reply (${rowData.unread_count} unread)` : "Reply"} 
            onClick={() => handleReplyOpen(rowData)}
          ></i>
          {rowData.unread_count > 0 && (
            <Badge 
              color="danger" 
              pill 
              style={{ 
                position: 'absolute', 
                top: '-5px', 
                right: '-8px', 
                fontSize: '10px', 
                padding: '2px 5px',
                border: '1.5px solid white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}
            >
              {rowData.unread_count}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-content">
      <div className="container-fluid">
        <Breadcrumbs title="Marketing" breadcrumbItem="AR Verification" />

        <div className="d-flex justify-content-end mb-3">
          <div className="search-box">
            <div className="position-relative">
              <Input
                type="text"
                className="form-control"
                placeholder="Keyword Search"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                style={{ width: '250px' }}
              />
              <i className="bx bx-search-alt search-icon" />
            </div>
          </div>
        </div>

          <DataTable
            value={rows}
            paginator
            rows={20}
            globalFilter={globalFilter}
            className="blue-bg"
            showGridlines
            dataKey="receipt_id"
            emptyMessage="No pending verifications found."
          >
            <Column field="receiptDate" header="Receipt Date" sortable body={(r) => formatDate(r.receiptDate)} style={{ width: '130px', whiteSpace: 'nowrap' }} className="text-center align-middle"></Column>
            <Column field="customerNameDisplay" header="Customer" sortable style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: '200px' }} className="align-middle"></Column>
            <Column field="receiptAmount" header="Receipt" sortable body={(r) => (r.receiptAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="text-end align-middle" style={{ width: '150px', whiteSpace: 'nowrap' }}></Column>
            <Column field="currencyCode" header="Currency" className="text-center align-middle" style={{ width: '100px' }}></Column>
            <Column field="entryType" header="Type" className="text-center align-middle" style={{ width: '120px' }} body={(r) => (
              <span className={`badge ${r.entryType === "Cashbook" ? "bg-info" : "bg-success"}`} style={{ fontSize: '11px', padding: '4px 8px', display: 'inline-block' }}>
                {r.entryType}
              </span>
            )}></Column>
            <Column header="Action" body={actionBodyTemplate} className="text-center align-middle" style={{ width: '100px' }}></Column>
          </DataTable>

        <Modal isOpen={verifyModal} toggle={() => setVerifyModal(false)} size="xl" centered>
          <ModalHeader toggle={() => setVerifyModal(false)}>
            {selectedRecord?.pending_verification === 0 || selectedRecord?.pending_verification === false ? "View AR Verification" : "AR Verification"} — {selectedRecord?.entryType || ""}
          </ModalHeader>
          <ModalBody className="pb-4">
            <Row className="mb-3 bg-light p-3 rounded mx-0">
              <Col md={4}><span className="fw-bold">Customer:</span> <span className="ms-2">{selectedRecord?.customerNameDisplay}</span></Col>
              <Col md={4} className="text-center"><span className="fw-bold">Amount:</span> <span className="ms-2 text-primary fs-5">{(receiptAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedRecord?.currencyCode}</span></Col>
              <Col md={4}>
                <FormGroup className="mb-0 d-flex align-items-center justify-content-end">
                  <Label className="me-2 mb-0 fw-bold">Exchange Rate:</Label>
                  <Input type="number" style={{ width: '100px' }} value={verificationData.exchangeRate} disabled={selectedRecord?.currencyCode === "IDR" || ((selectedRecord?.pending_verification === 0 || selectedRecord?.pending_verification === false) && !isEditingVerified)} onChange={(e) => setVerificationData(prev => ({ ...prev, exchangeRate: e.target.value }))} />
                </FormGroup>
              </Col>
            </Row>
            {loadingInvoices ? <div className="text-center p-5"><Spinner color="primary" /></div> : (
              <>
                <div className="d-flex justify-content-end mb-2">
                  <Input
                    type="text"
                    placeholder="Search Invoice No..."
                    bsSize="sm"
                    style={{ width: '250px' }}
                    value={invoiceSearch}
                    onChange={handleInvoiceSearch}
                  />
                </div>
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <Table bordered hover className="align-middle mb-0 table-sm">
                    <thead className="table-light text-center sticky-top" style={{ top: 0, zIndex: 10 }}>
                      <tr><th>Type</th><th>Invoice No.</th><th>Date</th><th>Balance Due</th><th style={{ width: '25%' }}>Payment Type</th><th>Allocate Amount</th><th style={{ width: '60px' }} className="text-center"><Input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} disabled={(selectedRecord?.pending_verification === 0 || selectedRecord?.pending_verification === false) && !isEditingVerified} /></th></tr>
                    </thead>
                    <tbody>
                      {verificationData.invoices.length === 0 ? <tr><td colSpan="7" className="text-center text-muted p-4">No Outstanding Invoices Found.</td></tr> : verificationData.invoices.map((inv, idx) => {
                        if (invoiceSearch && !inv.invNo.toString().toLowerCase().includes(invoiceSearch.toLowerCase())) {
                          return null;
                        }
                        return (
                          <tr key={`${inv.type}-${inv.id}`} className={inv.selected ? "table-active" : ""}>
                            <td className="text-center">
                              <Badge color={inv.type === "DN" ? "warning" : "primary"} className="px-2">{inv.type}</Badge>
                            </td>
                            <td className="text-center">{inv.invNo}</td><td className="text-center">{inv.date}</td><td className="text-end">{inv.balanceDue.toLocaleString()}</td>
                            <td className="text-center">
                              <FormGroup check inline><Input type="radio" name={`pay-${idx}`} checked={inv.paymentType === "Full"} disabled={(selectedRecord?.pending_verification === 0 || selectedRecord?.pending_verification === false) && !isEditingVerified} onChange={() => handleInvoiceChange(idx, "paymentType", "Full")} /><Label check className="ms-1 small">Full</Label></FormGroup>
                              <FormGroup check inline><Input type="radio" name={`pay-${idx}`} checked={inv.paymentType === "Partial"} disabled={(selectedRecord?.pending_verification === 0 || selectedRecord?.pending_verification === false) && !isEditingVerified} onChange={() => handleInvoiceChange(idx, "paymentType", "Partial")} /><Label check className="ms-1 small">Partial</Label></FormGroup>
                            </td>
                            <td><Input type="text" className="text-end form-control-sm" value={inv.amount ? formatNumber(inv.amount) : ""} disabled={inv.paymentType === "Full" || !inv.selected || ((selectedRecord?.pending_verification === 0 || selectedRecord?.pending_verification === false) && !isEditingVerified)} onChange={(e) => handleInvoiceChange(idx, "amount", e.target.value)} style={{ maxWidth: '150px', margin: '0 auto' }} /></td>
                            <td className="text-center"><Input type="checkbox" checked={inv.selected} disabled={(selectedRecord?.pending_verification === 0 || selectedRecord?.pending_verification === false) && !isEditingVerified} onChange={(e) => handleInvoiceChange(idx, "selected", e.target.checked)} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              </>
            )}
            <Row className="mt-4 pt-3 border-top align-items-end">
              <Col md={2}><Label className="fw-bold mb-1 small text-muted">Allocated</Label><Input type="text" className="fw-bold bg-white" value={totalAllocated.toLocaleString()} readOnly /></Col>
              <Col md={2}><Label className="fw-bold mb-1 small text-muted">Bank Charges</Label><Input type="text" value={verificationData.bankCharges === 0 ? "" : formatNumber(verificationData.bankCharges)} disabled={(selectedRecord?.pending_verification === 0 || selectedRecord?.pending_verification === false) && !isEditingVerified} onChange={(e) => setVerificationData(prev => ({ ...prev, bankCharges: parseNumber(e.target.value) }))} /></Col>
              <Col md={2}><Label className="fw-bold mb-1 small text-muted">Tax Deduction</Label><Input type="text" value={verificationData.taxDeduction === 0 ? "" : formatNumber(verificationData.taxDeduction)} disabled={(selectedRecord?.pending_verification === 0 || selectedRecord?.pending_verification === false) && !isEditingVerified} onChange={(e) => setVerificationData(prev => ({ ...prev, taxDeduction: parseNumber(e.target.value) }))} /></Col>
              <Col md={3}><Label className="fw-bold mb-1 small text-success">Advance Payment</Label><Input type="text" className="fw-bold text-success" value={verificationData.advancePayment === 0 ? "" : formatNumber(verificationData.advancePayment)} disabled={(selectedRecord?.pending_verification === 0 || selectedRecord?.pending_verification === false) && !isEditingVerified} onChange={(e) => setVerificationData(prev => ({ ...prev, advancePayment: parseNumber(e.target.value) }))} placeholder="Enter advance..." /></Col>
              <Col md={3}><Label className={`fw-bold mb-1 small ${isValid ? "text-success" : "text-danger"}`}>Total Utilized</Label><div className="input-group"><Input type="text" className={`fw-bold ${isValid ? "is-valid" : "is-invalid"}`} value={formatNumber(utilizedAmount)} readOnly />{!isValid && <span className="input-group-text text-danger bg-light" style={{ fontSize: '0.8rem' }}>Diff: {formatNumber(variance)}</span>}</div></Col>
            </Row>
            <div className="d-flex justify-content-end gap-2 mt-4">
              {(selectedRecord?.pending_verification === 0 || selectedRecord?.pending_verification === false) && !isEditingVerified && (
                <Button color="success" className="text-white" onClick={() => setIsEditingVerified(true)}>Edit</Button>
              )}
              {(!(selectedRecord?.pending_verification === 0 || selectedRecord?.pending_verification === false) || isEditingVerified) && (
                <Button color="primary" onClick={handleSaveDraft} disabled={savingDraft || loadingInvoices} style={{ width: '120px' }}>{savingDraft ? <Spinner size="sm" /> : "Update"}</Button>
              )}
              {(!(selectedRecord?.pending_verification === 0 || selectedRecord?.pending_verification === false)) && (
                <Button color="success" onClick={handlePostVerification} disabled={!isValid || loadingInvoices} style={{ width: '140px' }}>Verify</Button>
              )}
              <Button onClick={() => setVerifyModal(false)} color="secondary">
                {((selectedRecord?.pending_verification === 0 || selectedRecord?.pending_verification === false) && !isEditingVerified) ? "Close" : "Cancel"}
              </Button>
            </div>
          </ModalBody>
        </Modal>

        <Modal isOpen={replyModal} toggle={() => setReplyModal(false)} centered>
          <ModalHeader toggle={() => setReplyModal(false)}>Message Thread — {selectedRecord?.customerNameDisplay}</ModalHeader>
          <ModalBody>
            <div className="mb-3" style={{ maxHeight: '250px', overflowY: 'auto', padding: '10px', backgroundColor: '#f8f9fa' }}>
              {messageHistory.length === 0 ? (
                <div className="text-center text-muted py-3">No previous messages.</div>
              ) : (
                messageHistory.map((msg, i) => (
                  <div key={i} className={`mb-2 d-flex ${msg.sender_role === 'Marketing' ? 'justify-content-end' : 'justify-content-start'}`}>
                    <div style={{
                      maxWidth: '80%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      backgroundColor: msg.sender_role === 'Marketing' ? '#cfe2ff' : '#e2e3e5',
                      fontSize: '13px'
                    }}>
                      <div className="fw-bold mb-1" style={{ fontSize: '11px', color: '#666' }}>{msg.sender_role} • {new Date(msg.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                      {msg.message_text}
                    </div>
                  </div>
                ))
              )}
            </div>
            <FormGroup className="mb-0">
              <Label className="fw-bold">New Message:</Label>
              <Input type="textarea" rows="3" placeholder="Enter your reply to Finance..." value={verificationData.replyMessage} onChange={(e) => setVerificationData(prev => ({ ...prev, replyMessage: e.target.value }))} />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setReplyModal(false)}>Close</Button>
            <Button color="primary" onClick={handleSendReply}>Send <i className="bx bx-send ms-1"></i></Button>
          </ModalFooter>
        </Modal>

        {/* --- PRINT MODAL (MOVED TO AddBankBook.js) --- */}
        {/* <Modal
          isOpen={printModal}
          toggle={() => setPrintModal(false)}
          size="xl"
          centered
          style={{ maxWidth: '1100px', width: '95%' }}
        >
          <ModalHeader toggle={() => setPrintModal(false)}>Receipt Preview</ModalHeader>
          <ModalBody className="p-4" style={{ backgroundColor: '#f9f9f9', overflowX: 'auto' }}>
            ... Receipt Voucher Print Content ...
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setPrintModal(false)}>Close</Button>
            <Button color="info" onClick={triggerPrint}><i className="bx bx-printer me-1"></i> Print</Button>
          </ModalFooter>
        </Modal> */}
      </div>
    </div>
  );
};

export default VerifyCustomer;