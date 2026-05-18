import React, { useState, useEffect } from "react";
import { Card, CardBody, Col, Container, Row } from "reactstrap";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { FilterMatchMode } from "primereact/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast } from "react-toastify";
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import axios from "axios";
import { PYTHON_API_URL } from "common/pyapiconfig";
import { GetAllCurrencies, GetBankList } from "common/data/mastersapi";


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

const formatDate = (date) => {
    const d = new Date(date);
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
};

const formatPrintDate = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

const formatVoucherNumber = (no, type) => {
    if (!no || no === "-" || no === 0 || no === "0") return "-";
    
    // If it already has letters (like PPP001), don't add another prefix
    if (/^[A-Za-z]/.test(String(no))) return no;
    
    let prefix = "";
    const t = String(type || "").toLowerCase();
    
    if (t === 'receipt' || t === 'deposit') {
        prefix = "RV - ";
    } else if (t === 'payment' || t === 'transfer' || t === 'transfer to pc book' || t === 'deposit to bank') {
        prefix = "CV - ";
    } else if (t === 'other income') {
        prefix = "RCV - ";
    }
    
    return `${prefix}${no}`;
};

// Shared style: force React Select to the same height as Bootstrap controls (38px)
const selectSm = {
    control: (base) => ({ ...base, minHeight: "38px", height: "38px", fontSize: "14px" }),
    valueContainer: (base) => ({ ...base, padding: "0 8px" }),
    indicatorsContainer: (base) => ({ ...base, height: "38px" }),
    dropdownIndicator: (base) => ({ ...base, padding: "8px" }),
    clearIndicator: (base) => ({ ...base, padding: "8px" }),
    container: (base) => ({ ...base, width: "100%" }),
};



const CashBook = () => {
    const firstDayOfMonth = formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const today = formatDate(new Date());

    const [cashBook, setCashBook] = useState([]);
    const [bankList, setBankList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [globalFilter, setGlobalFilter] = useState("");
    const [filters, setFilters] = useState({
        description: { value: null, matchMode: FilterMatchMode.CONTAINS },
        voucherNo: { value: null, matchMode: FilterMatchMode.CONTAINS },
        transactionType: { value: null, matchMode: FilterMatchMode.CONTAINS },
        party: { value: null, matchMode: FilterMatchMode.CONTAINS },
        date: { value: null, matchMode: FilterMatchMode.DATE_IS },
    });


    const [fromDate, setFromDate] = useState(firstDayOfMonth);
    const [toDate, setToDate] = useState(today);

    // --- NEW: TRANSACTION TYPE FILTER ---
    const [transactionTypes] = useState([
        { value: 'Receipt', label: 'Receipt' },
        { value: 'Payment', label: 'Payment' },
        { value: 'Other Income', label: 'Other Income' },
        { value: 'Round plus', label: 'Round plus' },
        { value: 'Round minus', label: 'Round minus' },
        { value: 'Deposit', label: 'Deposit' },
        { value: 'Deposit to Bank', label: 'Deposit to Bank' },
        { value: 'Cash withdraw', label: 'Cash withdraw' },
        { value: 'Transfer to PC Book', label: 'Transfer to PC Book' }
    ]);
    const [selectedTransactionType, setSelectedTransactionType] = useState(null);
    const [currencyList, setCurrencyList] = useState([]);
    const [selectedCurrency, setSelectedCurrency] = useState(null);



    const fetchCashBook = async (overrideCurrency = null, bankListOverride = null) => {
        try {
            setLoading(true);
            setCashBook([]);

            const curToUse = overrideCurrency || selectedCurrency;

            // Use the Python API Report Endpoint
            const response = await axios.get(`${PYTHON_API_URL}/AR/cash/get-report`, {
                params: {
                    from_date: fromDate || null,
                    to_date: toDate || null,
                    bank_id: 0,
                    currency_id: curToUse?.value || 0
                }
            });

            let resultData = response.data?.data || [];

            // Apply transaction type filter if selected
            if (selectedTransactionType) {
                resultData = resultData.filter(item => {
                    const transType = item.TransactionType || "-";
                    // Only display items matching the selected type
                    return transType.toLowerCase() === selectedTransactionType.value.toLowerCase();
                });
            }

            const transformed = resultData.map((item) => {
                let cashIn = parseFloat(item.CashIn || 0);
                let cashOut = parseFloat(item.CashOut || 0);
                const type = item.TransactionType || "-";

                // Accounting Swap for Rounding as per user request
                if (type === 'Round plus') {
                    // Move from In to Out
                    cashOut = cashIn || cashOut; // Assuming it came in as CashIn
                    cashIn = 0;
                } else if (type === 'Round minus') {
                    // Move from Out to In
                    cashIn = cashOut || cashIn; // Assuming it came in as CashOut
                    cashOut = 0;
                }

                let balance = parseFloat(item.Balance || 0);

                // Handle transfer directions
                if (type === 'Transfer to PC Book' || type === 'Deposit to Bank') {
                    // Always Credit (outflow) for CB -> PC or CB -> Bank
                    cashOut = Math.abs(cashIn || cashOut);
                    cashIn = 0;
                } else if (type === 'transfer') {
                    const ref = item.VoucherNo || "";
                    if (ref.startsWith("CLM")) {
                        // Historical CB -> PC (Credit)
                        cashOut = Math.abs(cashIn || cashOut);
                        cashIn = 0;
                    } else {
                        // PC -> CB (Debit)
                        cashIn = Math.abs(cashIn || cashOut);
                        cashOut = 0;
                    }
                }

                const rawVoucher = item.VoucherNo ? item.VoucherNo.split(" - ")[0] : "-";
                let partyName = (item.Party === "Unknown Customer" || item.Party === "unknown customer") ? "-" : (item.Party || "-");
                
                // Decode bank name for deposits
                if (type === 'Deposit to Bank') {
                    const banksToUse = bankListOverride || bankList;
                    const bankId = parseInt(item.deposit_bank_id || item.CustomerID || item.customerId || 0);
                    const bank = banksToUse.find(b => parseInt(b.value) === bankId);
                    if (bank) partyName = bank.label;
                }

                return {
                    date: item.Date ? new Date(item.Date) : null,
                    voucherNo: formatVoucherNumber(rawVoucher, type),
                    transactionType: type,
                    party: partyName,
                    description: item.Description || "-",
                    bankName: item.BankName || "-",
                    actamount: item.NetAmount,
                    cashIn: cashIn,
                    cashOut: cashOut,
                    balance: balance,
                };
            });

            setCashBook(transformed);
        } catch (error) {
            toast.error("Error fetching cash book data.");
        } finally {
            setLoading(false);
        }
    };





    useEffect(() => {
        const loadInitialData = async () => {
            let initialCurrency = null;
            try {
                const currRes = await GetAllCurrencies({ currencyCode: "", currencyName: "" });
                const currData = currRes.data || currRes;
                if (Array.isArray(currData)) {
                    const allowedCurrencies = ["IDR", "USD", "MYR", "SGD", "CNY"];
                    const mapped = currData
                        .filter(c => allowedCurrencies.includes(c.CurrencyCode))
                        .map(c => ({
                            value: c.CurrencyId,
                            label: c.CurrencyCode
                        }));
                    setCurrencyList(mapped);

                    const idr = mapped.find(c => c.label === "IDR");
                    if (idr) {
                        setSelectedCurrency(idr);
                        initialCurrency = idr;
                    }
                }
            } catch (err) { console.error("Failed to load currencies", err); }
            // Load Banks for Lookups
            let fetchedBanks = [];
            try {
                const banks = await GetBankList(1, 1);
                fetchedBanks = banks.map(item => ({ value: item.value, label: item.BankName }));
                setBankList(fetchedBanks);
            } catch (err) { console.error("Failed to load banks", err); }

            fetchCashBook(initialCurrency, fetchedBanks);
        };
        loadInitialData();
    }, []);



    const exportToExcel = () => {
        const exportData = cashBook.map((ex) => ({
            Date: ex.date ? formatPrintDate(ex.date) : "-",
            "Description": ex.voucherNo,
            "Transaction Type": ex.transactionType,
            "Party / Account": ex.party,
            "Debit": ex.cashIn,
            "Credit": ex.cashOut,
            "Balance": ex.balance,
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cash Book");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        saveAs(data, `CashBook-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handlePrint = () => {
        const tableHTML = document.getElementById("print-section").innerHTML;
        const from = formatPrintDate(fromDate);
        const to = formatPrintDate(toDate);

        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
            <html>
                <head>
                    <title>Cash Book</title>
                    <style>
                        body { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; }
                        h2 { text-align: center; font-size: 12px; margin-bottom: 5px; }
                        p { text-align: center; font-size: 10px; margin-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; font-size: 9px; }
                        th, td { padding: 5px; border: 1px solid #ccc; text-align: left; }
                        th { background-color: #f8f8f8; }
                        .text-end { text-align: right; }
                    </style>
                </head>
                <body>
                    <h2>Cash Book Report</h2>
                    <p>From: ${from} To: ${to}</p>
                    ${tableHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const handleCancelFilters = () => {
        setSelectedTransactionType(null);
        setSelectedCurrency(null);
        setFromDate(firstDayOfMonth);
        setToDate(today);
        setFilters({
            description: { value: null, matchMode: FilterMatchMode.CONTAINS },
            voucherNo: { value: null, matchMode: FilterMatchMode.CONTAINS },
            transactionType: { value: null, matchMode: FilterMatchMode.CONTAINS },
            party: { value: null, matchMode: FilterMatchMode.CONTAINS },
            date: { value: null, matchMode: FilterMatchMode.DATE_IS },
        });
        setGlobalFilter("");
        setTimeout(() => fetchCashBook(), 100);
    };

    const renderHeader = () => {
        return (
            <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                    <button type="button" className="btn btn-danger" onClick={handleCancelFilters}>
                        <i className="bx bx-window-close font-size-14 align-middle me-2" /> Cancel
                    </button>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <input
                        type="text"
                        placeholder="Keyword Search"
                        className="form-control"
                        style={{ width: '250px' }}
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                    />
                </div>
            </div>
        );
    };

    const header = renderHeader();

    const dateBodyTemplate = (rowData) => {
        return formatPrintDate(rowData.date);
    };

    // --- 4. AUTO-REFRESH ON FILTER CHANGE ---
    useEffect(() => {
        // Pass selectedCurrency directly to avoid reading stale closure state
        fetchCashBook(selectedCurrency);
    }, [selectedCurrency, fromDate, toDate]);

    return (
        <div className="page-content">
            <Container fluid>
                <Breadcrumbs title="Finance" breadcrumbItem="Cash Book" />

                {/* Filter & Buttons Section — all in one line */}
                <Row className="mb-3 align-items-center g-3 quotation-mid">
                    <Col lg="2" md="3" className="d-flex align-items-center">
                        <label className="mb-0 me-2 fw-bold text-nowrap">Type</label>
                        <Select
                            className="flex-grow-1"
                            options={transactionTypes}
                            placeholder="Select Type"
                            value={selectedTransactionType}
                            onChange={setSelectedTransactionType}
                            isClearable
                            styles={selectSm}
                        />
                    </Col>
                    <Col lg="2" md="3" className="d-flex align-items-center">
                        <label className="mb-0 me-2 fw-bold text-nowrap">Currency</label>
                        <Select
                            className="flex-grow-1"
                            options={currencyList}
                            placeholder="Select Currency"
                            value={selectedCurrency}
                            onChange={setSelectedCurrency}
                            isClearable
                            styles={selectSm}
                        />
                    </Col>
                    <Col lg="2" md="3" className="d-flex align-items-center">
                        <label className="mb-0 me-2 fw-bold text-nowrap">From</label>
                        <Flatpickr
                            className="form-control"
                            value={fromDate}
                            onChange={(date) => {
                                if (date && date[0]) {
                                    setFromDate(formatDate(date[0]));
                                }
                            }}
                            options={{
                                altInput: true,
                                altFormat: "d-M-Y",
                                dateFormat: "Y-m-d"
                            }}
                            style={{ height: "38px" }}
                        />
                    </Col>
                    <Col lg="2" md="3" className="d-flex align-items-center">
                        <label className="mb-0 me-2 fw-bold text-nowrap">To</label>
                        <Flatpickr
                            className="form-control"
                            value={toDate}
                            onChange={(date) => {
                                if (date && date[0]) {
                                    setToDate(formatDate(date[0]));
                                }
                            }}
                            options={{
                                altInput: true,
                                altFormat: "d-M-Y",
                                dateFormat: "Y-m-d"
                            }}
                            style={{ height: "38px" }}
                        />
                    </Col>
                    <Col lg="4" className="d-flex gap-2 align-items-center justify-content-end">
                        <button type="button" className="btn btn-info" onClick={fetchCashBook}>
                            <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i>Search
                        </button>
                        <button type="button" className="btn btn-primary" onClick={handlePrint}>
                            <i className="bx bx-printer label-icon font-size-16 align-middle me-2"></i>Print
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={exportToExcel}>
                            <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i>Export
                        </button>
                    </Col>
                </Row>

                {/* Data Table */}
                <Row>
                    <Col lg="12">
                        <Card className="border-0 shadow-sm">
                            <CardBody>
                                <DataTable
                                    value={cashBook}
                                    header={header}
                                    loading={loading}
                                    paginator
                                    rows={25}
                                    filters={filters}
                                    onFilter={(e) => setFilters(e.filters)}
                                    globalFilter={globalFilter}
                                    globalFilterFields={["date", "voucherNo", "party", "transactionType", "cashIn", "cashOut", "balance"]}
                                    emptyMessage="No records found."
                                    showGridlines
                                    className="blue-bg"
                                    filterDisplay="menu"
                                    responsiveLayout="scroll"
                                    filter
                                >
                                    <Column field="date" header="Date" body={dateBodyTemplate} sortable />
                                    <Column field="voucherNo" header="Reference" filter filterPlaceholder="Search Description" sortable />
                                    <Column field="transactionType" header="Transaction Type" filter filterPlaceholder="Search Type" sortable />
                                    <Column field="party" header="Party / Account" filter filterPlaceholder="Search Party" sortable />


                                    <Column field="cashIn" header="Debit" body={(d) => d.cashIn.toLocaleString('en-US', {
                                        style: 'decimal',
                                        minimumFractionDigits: 2
                                    })} className="text-end" sortable />
                                    <Column field="cashOut" header="Credit" body={(d) => d.cashOut.toLocaleString('en-US', {
                                        style: 'decimal',
                                        minimumFractionDigits: 2
                                    })} className="text-end" sortable />
                                    <Column field="balance" header="Balance" body={(d) => d.balance.toLocaleString('en-US', {
                                        style: 'decimal',
                                        minimumFractionDigits: 2
                                    })} className="text-end" sortable />
                                </DataTable>

                                <div id="print-section" style={{ display: "none" }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>S.No.</th>
                                                <th>Date</th>
                                                <th>Description</th>
                                                <th>Transaction Type</th>
                                                <th>Party / Account</th>

                                                <th>Debit</th>
                                                <th>Credit</th>
                                                <th>Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cashBook.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{index + 1}</td>
                                                    <td>{formatPrintDate(item.date)}</td>
                                                    <td>{item.voucherNo}</td>
                                                    <td>{item.transactionType}</td>
                                                    <td>{item.party}</td>

                                                    <td className="text-end">{item.cashIn.toLocaleString('en-US', {
                                                        style: 'decimal',
                                                        minimumFractionDigits: 2
                                                    })}</td>
                                                    <td className="text-end">{item.cashOut.toLocaleString('en-US', {
                                                        style: 'decimal',
                                                        minimumFractionDigits: 2
                                                    })}</td>
                                                    <td className="text-end">{item.balance.toLocaleString('en-US', {
                                                        style: 'decimal',
                                                        minimumFractionDigits: 2
                                                    })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default CashBook;