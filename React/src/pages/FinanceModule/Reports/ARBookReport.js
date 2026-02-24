import React, { useState, useEffect, useRef, useMemo } from "react";
import { Container, Row, Col, Card, CardBody, Label } from "reactstrap";
import Breadcrumbs from "../../../components/Common/Breadcrumb";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_green.css";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";
import Select from "react-select";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { toast } from "react-toastify";

// --- API IMPORTS ---
import { getARBook, GetCustomerFilter } from "../service/financeapi";
import { GetInvoiceDetails, GetSalesDetails, GetItemFilter } from "../../../common/data/invoiceapi";
import { getDebitNoteById, getCreditNoteById } from "../../../common/data/mastersapi";

// --- HELPER: Date Formatter (dd-mm-yyyy) ---
const formatDate = (dateInput) => {
  if (!dateInput || dateInput === "N/A") return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
};

const ARBookReport = () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth() - 2, 1);

  // --- DATA STATES ---
  const [arBook, setArBook] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [bankList, setBankList] = useState([]);

  // --- FILTER STATES ---
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [globalFilter, setGlobalFilter] = useState("");
  const dtRef = useRef(null);

  const [currencyRates, setCurrencyRates] = useState({});
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(null);

  // --- INVOICE MODAL STATE ---
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // --- RECEIPT MODAL STATE ---
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // --- NOTE MODAL STATE ---
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteDetails, setNoteDetails] = useState(null);
  const [loadingNote, setLoadingNote] = useState(false);

  const [loadingData, setLoadingData] = useState(false);

  // --- STYLES ---
  const popupLabelStyle = {
    minWidth: "120px",
    fontWeight: "bold",
    color: "#495057"
  };

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const custRes = await GetCustomerFilter(1, "%");
        setCustomers(custRes);
        if (custRes && custRes.length > 0) {
          setSelectedCustomer(custRes[0]);
        }

        const itemRes = await GetItemFilter();
        if (Array.isArray(itemRes)) {
          setItems(itemRes);
        } else if (itemRes.data) {
          setItems(itemRes.data);
        }

        const currRes = await GetAllCurrencies({ currencyCode: "", currencyName: "" });
        const currencyData = currRes.data || currRes;
        if (Array.isArray(currencyData)) {
          const rates = {};
          currencyData.forEach(c => {
            rates[c.CurrencyCode] = c.ExchangeRate || c.Rate || c.SellingRate || 1;
          });
          setCurrencyRates(rates);
        }

        // Load Banks for Receipt Preview
        const banks = await GetBankList(1, 1);
        setBankList(banks.map(b => ({ value: b.value, label: b.BankName })));

      } catch (error) {
        console.error("Error loading masters:", error);
      }
    };
    loadMasters();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchARBook();
    }
  }, [selectedCustomer]);

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    return new Date(dateStr);
  };

  const fetchARBook = async () => {
    setLoadingData(true);
    try {
      const data = await getARBook(
        selectedCustomer ? selectedCustomer.value : 0,
        1, // OrgID
        1, // BranchID
        fromDate ? format(fromDate, "yyyy-MM-dd") : null,
        toDate ? format(toDate, "yyyy-MM-dd") : null
      );

      if (data.status && data.data?.length > 0) {
        let rawData = data.data;

        if (selectedItem) {
          rawData.sort((a, b) => parseDate(b.ledger_date) - parseDate(a.ledger_date));
        } else {
          rawData.sort((a, b) => parseDate(a.ledger_date) - parseDate(b.ledger_date));
        }

        if (selectedItem) {
          try {
            const salesPayload = {
              customerid: selectedCustomer ? selectedCustomer.value : 0,
              FromDate: fromDate ? format(fromDate, "yyyy-MM-dd") : "",
              ToDate: toDate ? format(toDate, "yyyy-MM-dd") : "",
              ItemId: selectedItem.value,
              BranchId: 1,
              IsAR: 1
            };

            const salesRes = await GetSalesDetails(salesPayload);
            const salesData = salesRes.data || salesRes;
            const validInvoiceNos = new Set(salesData.map(x => x.InvoiceNo));
            rawData = rawData.filter(row => validInvoiceNos.has(row.invoice_no));

          } catch (err) {
            console.error("Error filtering by item:", err);
            toast.warning("Could not filter by item. Showing all records.");
          }
        }

        const uniqueCurrencies = [...new Set(rawData.map(item => item.currencycode || item.CurrencyCode))];
        const newCurrencyOptions = uniqueCurrencies.filter(c => c).map(c => ({ label: c, value: c }));
        setCurrencyOptions(newCurrencyOptions);

        const convertedData = rawData.map(row => {
          const rawCurrency = row.currencycode || row.CurrencyCode || "";
          const currency = rawCurrency || "IDR";

          // LOGIC CHANGE: If a specific currency (other than IDR) is selected, DO NOT CONVERT.
          // Use Rate = 1 so the columns show the original values.
          let rate = (currency === "IDR") ? 1 : (currencyRates[currency] || 1);

          if (selectedCurrency && selectedCurrency.value !== "IDR") {
            if (currency === selectedCurrency.value) {
              rate = 1; // No conversion
            }
          }

          return {
            ...row,
            currencyCode: currency,
            _hasExplicitCurrency: !!rawCurrency,
            exchangeRate: rate,
            convertedInvoiceAmount: (parseFloat(row.invoice_amount) || 0) * rate,
            convertedReceiptAmount: (parseFloat(row.receipt_amount) || 0) * rate,
            convertedDebitNote: (parseFloat(row.debit_note_amount) || 0) * rate,
            convertedCreditNote: (parseFloat(row.credit_note_amount) || 0) * rate,
          };
        });

        const groupedMap = new Map();
        const finalRows = [];

        convertedData.forEach(row => {
          const refNo = row.invoice_no ? String(row.invoice_no).trim() : "";
          const shouldGroup = refNo && !refNo.startsWith("DO") && !refNo.startsWith("27") && row.convertedReceiptAmount === 0;

          if (shouldGroup) {
            const key = `${refNo}_${row.currencyCode}`;

            if (groupedMap.has(key)) {
              const existing = groupedMap.get(key);
              existing.convertedInvoiceAmount += row.convertedInvoiceAmount;
              existing.convertedDebitNote += row.convertedDebitNote;
              existing.convertedCreditNote += row.convertedCreditNote;
              existing.invoice_amount = (parseFloat(existing.invoice_amount) || 0) + (parseFloat(row.invoice_amount) || 0);
            } else {
              groupedMap.set(key, { ...row });
            }
          } else {
            finalRows.push(row);
          }
        });

        groupedMap.forEach(value => finalRows.push(value));
        finalRows.sort((a, b) => parseDate(a.ledger_date) - parseDate(b.ledger_date));

        setArBook(finalRows);
      } else {
        setArBook([]);
      }
    } catch (err) {
      toast.error("Failed to load AR data");
      setArBook([]);
    } finally {
      setLoadingData(false);
    }
  };

  const handleInvoiceClick = async (rowData) => {
    const invoiceIdentifier = rowData.invoice_no;

    if (!invoiceIdentifier) {
      toast.warning("No Invoice Number available.");
      return;
    }

    setLoadingDetails(true);
    setShowInvoiceDialog(true);
    setInvoiceDetails(null);

    try {
      const response = await GetInvoiceDetails(invoiceIdentifier);
      const data = response.data || response;

      if (data) {
        setInvoiceDetails(data);
      } else {
        toast.warning("No details returned for this invoice.");
      }
    } catch (err) {
      console.error("API Fetch Error:", err);
      toast.error("Failed to fetch invoice details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleReceiptClick = (rowData) => {
    setSelectedReceipt(rowData);
    setShowReceiptDialog(true);
  };

  const handleNoteClick = async (rowData, type) => {
    const noteId = rowData.transaction_id || rowData.id || rowData.real_invoice_id;
    if (!noteId) {
      toast.warning("No ID available for this Note.");
      return;
    }

    setLoadingNote(true);
    setShowNoteDialog(true);
    setNoteDetails(null);

    try {
      let response;
      if (type === 'DN') {
        response = await getDebitNoteById(noteId);
      } else {
        response = await getCreditNoteById(noteId);
      }

      const data = response?.data;
      if (data) {
        setNoteDetails({ ...data, type });
      } else {
        toast.warning(`No details returned for this ${type === 'DN' ? 'Debit' : 'Credit'} Note.`);
        setShowNoteDialog(false);
      }
    } catch (err) {
      console.error("API Fetch Error:", err);
      toast.error(`Failed to fetch ${type} details.`);
    } finally {
      setLoadingNote(false);
    }
  };

  const getBankName = (record) => {
    if (!record) return "";
    const bId = record.deposit_bank_id || record.bank_id;
    return record.bank_name || (bankList.find(b => b.value == bId)?.label) || "";
  };

  const finalProcessedData = useMemo(() => {
    let filtered = selectedCurrency
      ? arBook.filter((x) => x._hasExplicitCurrency && x.currencyCode === selectedCurrency.value)
      : arBook;

    filtered = filtered.filter(item => {
      const ref = item.invoice_no ? String(item.invoice_no).trim().toUpperCase() : "";
      return !ref.startsWith("DO") && !ref.startsWith("27");
    });

    let runningBalance = 0;
    return filtered.map(row => {
      const rowBalance = (row.convertedInvoiceAmount || 0) + (row.convertedDebitNote || 0)
        - (row.convertedCreditNote || 0) - (row.convertedReceiptAmount || 0);
      runningBalance += rowBalance;

      return {
        ...row,
        balanceDue: rowBalance,
        cumulativeBalance: runningBalance
      };
    });
  }, [arBook, selectedCurrency]);

  const totalARValue = useMemo(() => {
    if (finalProcessedData.length === 0) return 0;
    return finalProcessedData[finalProcessedData.length - 1].cumulativeBalance;
  }, [finalProcessedData]);

  const hasForeignCurrency = useMemo(() => {
    return finalProcessedData.some(row => row.currencyCode && row.currencyCode !== 'IDR');
  }, [finalProcessedData]);


  const exportExcel = () => {
    const exportData = finalProcessedData.map(item => ({
      Date: format(new Date(item.ledger_date), "dd-MMM-yyyy"),
      "Reference No.": item.convertedReceiptAmount > 0 ? "" : item.invoice_no,
      "Other Currency": item.currencyCode !== 'IDR' ? item.invoice_amount?.toLocaleString() : "",
      "Invoice Amount (A)": item.convertedInvoiceAmount,
      "Balance Due": item.balanceDue,
      "Debit Note (B)": item.convertedDebitNote,
      "Receipt (C)": item.convertedReceiptAmount,
      "Credit Note (D)": item.convertedCreditNote,
      "Balance ((A+B)-(C+D))": item.cumulativeBalance
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AR Book");
    XLSX.writeFile(wb, "AR_Book.xlsx");
  };

  const referenceBodyTemplate = (row) => {
    // Check if it is a Receipt (Amount in Receipt Column > 0)
    if (row.convertedReceiptAmount > 0) {
      return (
        <span className="text-success fw-bold">
          {row.receipt_no || row.invoice_no || "-"}
        </span>
      );
    }

    // Check if Debit Note (Amount > 0)
    if (row.convertedDebitNote > 0 && !row.convertedInvoiceAmount && !row.convertedCreditNote) {
      return (
        <span
          className="text-danger fw-bold"
          style={{ cursor: "pointer", textDecoration: "underline" }}
          onClick={() => handleNoteClick(row, 'DN')}
          title="View Debit Note Details"
        >
          {row.invoice_no || row.ar_no || "DN"}
        </span>
      );
    }

    // Check if Credit Note (Amount > 0)
    if (row.convertedCreditNote > 0 && !row.convertedInvoiceAmount && !row.convertedDebitNote) {
      return (
        <span
          className="text-warning fw-bold"
          style={{ cursor: "pointer", textDecoration: "underline" }}
          onClick={() => handleNoteClick(row, 'CN')}
          title="View Credit Note Details"
        >
          {row.invoice_no || row.ar_no || "CN"}
        </span>
      );
    }

    // Else it is likely an Invoice
    return (
      <span
        className="text-primary fw-bold"
        style={{ cursor: "pointer", textDecoration: "underline" }}
        onClick={() => handleInvoiceClick(row)}
        title="View Invoice Details"
      >
        {row.invoice_no}
      </span>
    );
  };

  const otherCurrencyBodyTemplate = (rowData) => {
    if (rowData.currencyCode && rowData.currencyCode !== 'IDR') {
      const originalAmt = rowData.convertedReceiptAmount > 0
        ? rowData.receipt_amount
        : (rowData.invoice_amount || rowData.credit_note_amount || rowData.debit_note_amount);

      return (
        <span
          className="text-muted"
          style={{ fontSize: '12px', cursor: 'pointer' }}
          title={`Ex. Rate: ${rowData.exchangeRate?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        >
          {parseFloat(originalAmt).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      );
    }
    return "";
  };

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Reports" breadcrumbItem="AR Book" />
        <Row>
          <Col lg="12">
            <Card>
              <CardBody>
                {/* --- Row 1: Selection Filters --- */}
                <Row className="mb-3">
                  <Col md="4" className="d-flex align-items-center mb-2">
                    <Label className="me-2 mb-0" style={{ minWidth: "80px" }}>Customer:</Label>
                    <Select options={customers} onChange={setSelectedCustomer} value={selectedCustomer} isClearable className="flex-grow-1" />
                  </Col>

                  <Col md="4" className="d-flex align-items-center mb-2">
                    <Label className="me-2 mb-0" style={{ minWidth: "60px" }}>Item:</Label>
                    <Select
                      options={items}
                      onChange={setSelectedItem}
                      value={selectedItem}
                      isClearable
                      placeholder="Select Item..."
                      className="flex-grow-1"
                    />
                  </Col>

                  <Col md="4" className="d-flex align-items-center mb-2">
                    <Label className="me-2 mb-0" style={{ minWidth: "80px" }}>Currency:</Label>
                    <Select options={currencyOptions} value={selectedCurrency} onChange={setSelectedCurrency} isClearable className="flex-grow-1" />
                  </Col>
                </Row>

                {/* --- Row 2: Date Filters --- */}
                <Row className="mb-3">
                  <Col md="4" className="d-flex align-items-center mb-2">
                    <Label className="me-2 mb-0" style={{ minWidth: "80px" }}>From:</Label>
                    <Flatpickr className="form-control" value={fromDate} onChange={(date) => setFromDate(date[0])} options={{ altInput: true, altFormat: "d-M-Y", dateFormat: "Y-m-d" }} />
                  </Col>

                  <Col md="4" className="d-flex align-items-center mb-2">
                    <Label className="me-2 mb-0" style={{ minWidth: "60px" }}>To:</Label>
                    <Flatpickr className="form-control" value={toDate} onChange={(date) => setToDate(date[0])} options={{ altInput: true, altFormat: "d-M-Y", dateFormat: "Y-m-d" }} />
                  </Col>
                </Row>

                {/* --- Row 3: Totals & Actions --- */}
                <Row>
                  <Col md="12" className="d-flex justify-content-between align-items-center mt-2 border-top pt-3">
                    <div className="d-flex align-items-center">
                      <h5 className="mb-0 me-2">Total AR Value:</h5>
                      <h4 className="mb-0 fw-bold" style={{ color: "firebrick" }}>
                        {totalARValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </h4>
                    </div>

                    <div className="text-end">
                      <button type="button" className="btn btn-primary me-2" onClick={fetchARBook} disabled={loadingData}>
                        {loadingData ? "Loading..." : "Search"}
                      </button>
                      <button type="button" className="btn btn-success me-2" onClick={exportExcel}>Export</button>
                      <button type="button" className="btn btn-secondary" onClick={() => window.print()}>Print</button>
                    </div>
                  </Col>
                </Row>

                <div className="table-responsive mt-3">
                  <DataTable
                    ref={dtRef}
                    value={finalProcessedData}
                    paginator
                    rows={20}
                    loading={loadingData}
                    globalFilter={globalFilter}
                    style={{ fontSize: '13px' }}
                    header={
                      <div className="d-flex justify-content-end">
                        <InputText type="search" placeholder="Global Search" className="form-control" style={{ width: "250px" }} value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
                      </div>
                    }
                    responsiveLayout="scroll"
                  >
                    <Column field="ledger_date" header="Date" body={(row) => format(new Date(row.ledger_date), "dd-MMM-yyyy")} headerStyle={{ whiteSpace: 'nowrap' }} />
                    <Column field="invoice_no" header="Reference No." body={referenceBodyTemplate} headerStyle={{ whiteSpace: 'nowrap' }} />
                    {hasForeignCurrency && (!selectedCurrency || selectedCurrency.value === 'IDR') && (
                      <Column
                        header="Other Currency"
                        body={otherCurrencyBodyTemplate}
                        className="text-end"
                        headerStyle={{ whiteSpace: 'nowrap', color: 'white' }}
                      />
                    )}
                    <Column field="convertedInvoiceAmount" header="Invoice Amount (A)" body={(r) => r.convertedInvoiceAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} className="text-end" />
                    {/* REMOVED: Balance ToReceive Column */}
                    {/* <Column field="balanceDue" header="Balance ToReceive" body={(r) => r.balanceDue?.toLocaleString('en-US', { minimumFractionDigits: 2 })} className="text-end" /> */}
                    <Column field="convertedReceiptAmount" header="Receipt (C)" body={(r) => r.convertedReceiptAmount > 0 ? <span style={{ color: 'red', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleReceiptClick(r)} title="View Receipt Voucher">{r.convertedReceiptAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> : <span style={{ color: 'red' }}>{r.convertedReceiptAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>} className="text-end" />
                    <Column field="convertedDebitNote" header="Debit Note (B)" body={(r) => r.convertedDebitNote?.toLocaleString('en-US', { minimumFractionDigits: 2 })} className="text-end" />
                    <Column field="convertedCreditNote" header="Credit Note (D)" body={(r) => <span style={{ color: 'red' }}>{r.convertedCreditNote?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>} className="text-end" />
                    <Column field="cumulativeBalance" header="Balance ((A+B)-(C+D))" body={(d) => d.cumulativeBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 })} className="text-end" />
                  </DataTable>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* --- INVOICE VIEW POPUP --- */}
        <Dialog
          header={`Invoice View: ${invoiceDetails?.InvoiceNbr || ''}`}
          visible={showInvoiceDialog}
          style={{ width: '60vw' }}
          onHide={() => setShowInvoiceDialog(false)}
          draggable={false}
          resizable={false}
        >
          {loadingDetails ? (
            <div className="d-flex justify-content-center p-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : invoiceDetails ? (
            <div>
              <div className="mb-4">
                <Row className="mb-2">
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Customer</span>
                    <span>: {invoiceDetails.CustomerName}</span>
                  </Col>
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Invoice Date</span>
                    <span>: {invoiceDetails.Salesinvoicesdate ? format(new Date(invoiceDetails.Salesinvoicesdate), "dd-MMM-yyyy") : ''}</span>
                  </Col>
                </Row>
                <Row className="mb-2">
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Total Amount</span>
                    <span>: {invoiceDetails.TotalAmount?.toLocaleString()}</span>
                  </Col>
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Status</span>
                    <span>: <span className="badge bg-info">{invoiceDetails.Status}</span></span>
                  </Col>
                </Row>
              </div>
              <DataTable
                value={invoiceDetails.Items || []}
                className="p-datatable-sm p-datatable-gridlines"
                responsiveLayout="scroll"
              >
                <Column field="gascodeid" header="Item Code" />
                <Column field="GasName" header="Description" body={(r) => r.GasName || r.ItemName || "Item"} />
                <Column field="PickedQty" header="Qty" className="text-end" />
                <Column field="UnitPrice" header="Unit Price" className="text-end" body={(r) => r.UnitPrice?.toLocaleString()} />
                <Column field="TotalPrice" header="Total" className="text-end" body={(r) => r.TotalPrice?.toLocaleString()} />
              </DataTable>
              <div className="text-end mt-3">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowInvoiceDialog(false)}>Close</button>
              </div>
            </div>
          ) : (
            <div className="text-center p-3 text-muted">
              No details found for this invoice.
            </div>
          )}
        </Dialog>

        {/* --- RECEIPT VIEW POPUP (Styled like Invoice View) --- */}
        <Dialog
          header={`Receipt View: ${selectedReceipt?.receipt_no || selectedReceipt?.invoice_no || ''}`}
          visible={showReceiptDialog}
          style={{ width: '60vw' }}
          onHide={() => setShowReceiptDialog(false)}
          draggable={false}
          resizable={false}
        >
          {selectedReceipt ? (
            <div>
              {/* HEADER INFO SECTION - Matching Invoice View Format */}
              <div className="mb-4">
                <Row className="mb-2">
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Customer</span>
                    <span>: {selectedReceipt.customer_name || selectedCustomer?.label}</span>
                  </Col>
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Receipt Date</span>
                    <span>: {formatDate(selectedReceipt.ledger_date)}</span>
                  </Col>
                </Row>

                <Row className="mb-2">
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Total Amount</span>
                    <span>: {parseFloat(selectedReceipt.receipt_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </Col>
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Status</span>
                    <span>: <span className="badge bg-success">Posted</span></span>
                  </Col>
                </Row>

                {/* PAYMENT METHOD SECTION - Custom Underline Style */}
                <Row className="mb-2">
                  <Col md={12} className="d-flex align-items-baseline">
                    <span style={popupLabelStyle}>Payment Method</span>
                    <span className="me-1">:</span>
                    <div style={{
                      borderBottom: '1px solid #ced4da',
                      flexGrow: 1,
                      paddingLeft: '5px',
                      fontSize: '14.5px', // Matching standard font size
                      color: '#495057',
                      fontWeight: 'normal' // Ensuring 'Transfer' and Bank are NOT bold
                    }}>
                      Bank Transfer {getBankName(selectedReceipt)}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* ALLOCATIONS TABLE - COMMENTED OUT */}
              {/* <Label className="fw-bold text-muted mb-2" style={{ fontSize: '12px', textTransform: 'uppercase' }}>
                Invoices Paid by this Receipt
              </Label>
              <DataTable
                value={selectedReceipt.allocations || []} 
                className="p-datatable-sm p-datatable-gridlines"
                responsiveLayout="scroll"
                emptyMessage="No direct allocations found for this receipt."
              >
                <Column field="invoice_no" header="Invoice No." />
                <Column 
                  field="amount_allocated" 
                  header="Amount Paid" 
                  className="text-end" 
                  body={(r) => parseFloat(r.amount_allocated || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} 
                />
              </DataTable> */}

              <div className="text-end mt-3">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowReceiptDialog(false)}>Close</button>
              </div>
            </div>
          ) : (
            <div className="text-center p-3 text-muted">No details found for this receipt.</div>
          )}
        </Dialog>

        {/* --- NOTE (DN/CN) VIEW POPUP --- */}
        <Dialog
          header={`${noteDetails?.type === 'DN' ? 'Debit Note' : 'Credit Note'} View: ${noteDetails?.DebitNoteNumber || noteDetails?.DebitNoteNo || noteDetails?.CreditNoteNumber || noteDetails?.CreditNoteNo || ''}`}
          visible={showNoteDialog}
          style={{ width: '50vw' }}
          onHide={() => setShowNoteDialog(false)}
          draggable={false}
          resizable={false}
        >
          {loadingNote ? (
            <div className="d-flex justify-content-center p-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : noteDetails ? (
            <div>
              <div className="mb-4">
                <Row className="mb-2">
                  <Col md={12} className="d-flex">
                    <span style={popupLabelStyle}>Customer</span>
                    <span>: {selectedCustomer?.label || noteDetails.CustomerId}</span>
                  </Col>
                </Row>
                <Row className="mb-2">
                  <Col md={12} className="d-flex">
                    <span style={popupLabelStyle}>Date</span>
                    <span>: {noteDetails.TransactionDate || noteDetails.Date ? format(new Date(noteDetails.TransactionDate || noteDetails.Date), "dd-MMM-yyyy") : ''}</span>
                  </Col>
                </Row>
                <Row className="mb-2">
                  <Col md={12} className="d-flex">
                    <span style={popupLabelStyle}>Amount</span>
                    <span>: <span className="fw-bold fs-6">{(noteDetails.Amount || noteDetails.DebitAmount || noteDetails.CreditAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> {noteDetails.CurrencyCode || 'IDR'}</span>
                  </Col>
                </Row>
                <Row className="mb-2">
                  <Col md={12} className="d-flex">
                    <span style={popupLabelStyle}>Linked Invoice ID</span>
                    <span>: {noteDetails.InvoiceId || noteDetails.InvoiceNo || '-'}</span>
                  </Col>
                </Row>
                <Row className="mb-2">
                  <Col md={12} className="d-flex align-items-baseline">
                    <span style={popupLabelStyle}>Description</span>
                    <span className="me-1">:</span>
                    <div className="flex-grow-1 text-muted">
                      {noteDetails.Description || '-'}
                    </div>
                  </Col>
                </Row>
              </div>
              <div className="text-end mt-3 border-top pt-3">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowNoteDialog(false)}>Close</button>
              </div>
            </div>
          ) : (
            <div className="text-center p-3 text-muted">
              No details found for this Note.
            </div>
          )}
        </Dialog>

      </Container>
    </div>
  );
};

export default ARBookReport;