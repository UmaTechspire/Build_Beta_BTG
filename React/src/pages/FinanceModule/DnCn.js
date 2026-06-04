import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
    Container,
    Card,
    CardBody,
    Row,
    Col,
    Label,
    Button,
    Collapse
} from "reactstrap";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from 'primereact/api';
import { getAllDebitNotes, getAllCreditNotes, getCustomersDNCN, deleteDebitNote, deleteCreditNote } from "../../common/data/mastersapi";
import axios from "axios";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

const getUserDetails = () => {
    if (localStorage.getItem("authUser")) {
        try {
            return JSON.parse(localStorage.getItem("authUser"));
        } catch (e) {
            return null;
        }
    }
    return null;
};

const DnCn = () => {
    const history = useHistory();
    // Dates
    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());

    // Toggle State
    const [isDebitOpen, setIsDebitOpen] = useState(true);
    const [isCreditOpen, setIsCreditOpen] = useState(true);

    // Grid Data & loading
    const [debitNotes, setDebitNotes] = useState([]);
    const [creditNotes, setCreditNotes] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination Persistence
    const [dnFirst, setDnFirst] = useState(parseInt(localStorage.getItem("dn_cn_dn_first")) || 0);
    const [cnFirst, setCnFirst] = useState(parseInt(localStorage.getItem("dn_cn_cn_first")) || 0);

    // Filters
    const [dnGlobalFilterValue, setDnGlobalFilterValue] = useState("");
    const [cnGlobalFilterValue, setCnGlobalFilterValue] = useState("");

    const user = getUserDetails();
    const isSuperAdmin = user?.u_id === 158;
    const [dnFilters, setDnFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    });
    const [cnFilters, setCnFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch Customers for mapping
            const custRes = await getCustomersDNCN();
            const customerMap = {};
            if (custRes && custRes.status === "success") {
                custRes.data.forEach(c => {
                    customerMap[c.Id] = c.CustomerName;
                });
            }

            // Fetch Debit Notes
            const debitRes = await getAllDebitNotes();
            if (debitRes && debitRes.status === "success") {
                const formattedDebit = debitRes.data.map(d => ({
                    ...d,
                    DebitNoteId: d.DebitNoteId,
                    dnNo: d.DebitNoteNumber || d.DebitNoteNo,
                    date: d.TransactionDate || d.Date,
                    amount: d.Amount || d.DebitAmount || 0,
                    description: d.Description,
                    customer: customerMap[d.CustomerId] || d.CustomerId,
                    invoiceNo: d.InvoiceId || d.InvoiceNo, // Showing ID as that's what we have in main table
                    currency: d.CurrencyCode,
                    status: d.IsSubmitted ? "Posted" : "Saved"
                }));
                setDebitNotes(formattedDebit);
            }

            // Fetch Credit Notes
            const creditRes = await getAllCreditNotes();
            if (creditRes && creditRes.status === "success") {
                const formattedCredit = creditRes.data.map(c => ({
                    ...c,
                    CreditNoteId: c.CreditNoteId,
                    cnNo: c.CreditNoteNumber || c.CreditNoteNo,
                    date: c.TransactionDate || c.Date,
                    amount: c.Amount || c.CreditAmount || 0,
                    description: c.Description,
                    customer: customerMap[c.CustomerId] || c.CustomerId,
                    invoiceNo: c.InvoiceId || c.InvoiceNo,
                    currency: c.CurrencyCode,
                    status: c.IsSubmitted ? "Posted" : "Saved"
                }));
                setCreditNotes(formattedCredit);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const onDnGlobalFilterChange = (e) => {
        const value = e.target.value;
        setDnGlobalFilterValue(value);
        setDnFilters((prevFilters) => ({
            ...prevFilters,
            global: { value, matchMode: FilterMatchMode.CONTAINS }
        }));
    };

    const onCnGlobalFilterChange = (e) => {
        const value = e.target.value;
        setCnGlobalFilterValue(value);
        setCnFilters((prevFilters) => ({
            ...prevFilters,
            global: { value, matchMode: FilterMatchMode.CONTAINS }
        }));
    };

    const clearDnFilter = () => {
        setDnGlobalFilterValue("");
        setDnFilters({
            global: { value: null, matchMode: FilterMatchMode.CONTAINS }
        });
    };

    const clearCnFilter = () => {
        setCnGlobalFilterValue("");
        setCnFilters({
            global: { value: null, matchMode: FilterMatchMode.CONTAINS }
        });
    };

    const getSeverity = (status) => {
        switch (status) {
            case 'Posted': return 'success';
            case 'Saved': return 'danger';
            default: return 'info';
        }
    };

    const statusBodyTemplate = (rowData) => {
        const statusShort = rowData.status === "Saved" ? "S" : rowData.status === "Posted" ? "P" : rowData.status;
        return <Tag value={statusShort} severity={getSeverity(rowData.status)} />;
    };

    const formatDate = (date) => {
        if (!date) return "-";
        const d = new Date(date);
        if (isNaN(d.getTime())) return "-";
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            .replace(/ /g, '-');
    };

    const dateBodyTemplate = (rowData) => {
        return formatDate(rowData.date);
    };

    // Shared Header for both tables or just one top control? 
    // User asked "look exactly like JournalCtx", which has the search bar INSIDE the card.
    // I will put the Search/Legend bar OUTSIDE the collapsible sections so it applies generally, 
    // OR replicate it inside. 
    // Replicating inside might be cleaner if they are treated as separate lists.
    // But let's try a common control bar above the accordions.

    const renderTableHeader = (type) => {
        const value = type === 'debit' ? dnGlobalFilterValue : cnGlobalFilterValue;
        const onChange = type === 'debit' ? onDnGlobalFilterChange : onCnGlobalFilterChange;
        const onClear = type === 'debit' ? clearDnFilter : clearCnFilter;

        return (
            <div className="row align-items-center g-3 clear-spa p-2">
                <div className="col-12 col-lg-6">
                    <Button className="btn btn-danger btn-label" onClick={onClear} size="sm">
                        <i className="mdi mdi-filter-off label-icon" /> Clear
                    </Button>
                </div>
                <div className="col-12 col-lg-3 text-end">
                    <span className="me-4"><Tag value="S" severity={getSeverity("Saved")} /> Saved</span>
                    <span className="me-1"><Tag value="P" severity={getSeverity("Posted")} /> Posted</span>
                </div>
                <div className="col-12 col-lg-3">
                    <InputText
                        type="search"
                        value={value}
                        onChange={onChange}
                        placeholder="Keyword Search"
                        className="form-control form-control-sm"
                    />
                </div>
            </div>
        );
    };

    const handleDelete = async (rowData) => {
        const type = rowData.dnNo ? 'debit' : 'credit';
        const id = type === 'debit' ? rowData.DebitNoteId : rowData.CreditNoteId;
        const noteNo = type === 'debit' ? rowData.dnNo : rowData.cnNo;

        Swal.fire({
            title: "Are you sure?",
            text: `Do you want to delete ${type === 'debit' ? 'Debit' : 'Credit'} Note ${noteNo}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#f46a6a",
            cancelButtonColor: "#74788d",
            confirmButtonText: "Yes, delete it!",
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    setLoading(true);
                    const res = type === 'debit' ? await deleteDebitNote(id) : await deleteCreditNote(id);
                    if (res.status === 'success') {
                        toast.success(res.message || "Deleted successfully");
                        loadData(); // Refresh list
                    } else {
                        toast.error(res.message || "Deletion failed");
                    }
                } catch (error) {
                    console.error("Delete error:", error);
                    toast.error("An error occurred while deleting");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const actionBodyTemplate = (rowData) => {
        return (
            <div className="d-flex gap-2 justify-content-center">
                <span
                    className="text-primary cursor-pointer"
                    title="Edit"
                    style={{ cursor: 'pointer' }}
                    onClick={() => history.push({
                        pathname: `/edit-dn-cn/${rowData.dnNo ? rowData.DebitNoteId : rowData.CreditNoteId}`,
                        state: { type: rowData.dnNo ? 'debit' : 'credit' }
                    })}
                >
                    <i className="mdi mdi-square-edit-outline font-size-18"></i>
                </span>
                {isSuperAdmin && (
                    <span
                        className="text-danger cursor-pointer"
                        title="Delete"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleDelete(rowData)}
                    >
                        <i className="mdi mdi-trash-can-outline font-size-18"></i>
                    </span>
                )}
            </div>
        );
    };

    const amountBodyTemplate = (rowData) => {
        return (rowData.amount !== undefined && rowData.amount !== null) ? Number(rowData.amount).toLocaleString('en-US', { style: 'decimal', minimumFractionDigits: 2 }) : "0.00";
    };

    return (
        <div className="page-content">
            <Container fluid>
                <Breadcrumbs title="Finance" breadcrumbItem="DN / CN" />

                {/* Top Actions & Date Filter */}
                <Row>
                    <Col lg="12">
                        <Card className="search-top">
                            <div className="row align-items-end g-1 quotation-mid">
                                <div className="col-12 col-lg-5 mt-1">
                                    <div className="d-flex align-items-center gap-2">
                                        {/* From Date */}
                                        <div className="d-flex align-items-center gap-2">
                                            <Label className="form-label mb-0" style={{ minWidth: "40px" }}>From</Label>
                                            <Flatpickr
                                                className="form-control d-block"
                                                placeholder="dd-mm-yyyy"
                                                options={{
                                                    altInput: true,
                                                    altFormat: "d-M-Y",
                                                    dateFormat: "Y-m-d",
                                                }}
                                                value={fromDate}
                                                onChange={(date) => setFromDate(date[0])}
                                            />
                                        </div>
                                        {/* To Date */}
                                        <div className="d-flex align-items-center gap-2 ms-3">
                                            <Label className="form-label mb-0" style={{ minWidth: "20px" }}>To</Label>
                                            <Flatpickr
                                                className="form-control d-block"
                                                placeholder="dd-mm-yyyy"
                                                options={{
                                                    altInput: true,
                                                    altFormat: "d-M-Y",
                                                    dateFormat: "Y-m-d",
                                                }}
                                                value={toDate}
                                                onChange={(date) => setToDate(date[0])}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12 col-lg-7 d-flex justify-content-end flex-wrap gap-2">
                                    <button type="button" className="btn btn-info">
                                        <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i> Search
                                    </button>
                                    <button type="button" className="btn btn-danger">
                                        <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i> Cancel
                                    </button>
                                    <button type="button" className="btn btn-success" onClick={() => history.push("/add-dn-cn")}>
                                        <i className="bx bx-plus label-icon font-size-16 align-middle me-2"></i> New
                                    </button>
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>



                {/* Debit Note Section */}
                <div className="accordion-item mb-2 border rounded">
                    <h2 className="accordion-header" id="headingDebit">
                        <button
                            className={`accordion-button ${!isDebitOpen ? 'collapsed' : ''} bg-light fw-bold`}
                            type="button"
                            onClick={() => setIsDebitOpen(!isDebitOpen)}
                            style={{ width: '100%', textAlign: 'left', padding: '1rem', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                            <span><i className="bx bx-file me-2"></i> Debit Note</span>
                            <i className={`bx ${isDebitOpen ? 'bx-chevron-up' : 'bx-chevron-down'}`}></i>
                        </button>
                    </h2>
                    <Collapse isOpen={isDebitOpen}>
                        <div className="accordion-body p-0">
                            <DataTable
                                value={debitNotes}
                                paginator
                                rows={10}
                                first={dnFirst}
                                onPage={(e) => {
                                    setDnFirst(e.first);
                                    localStorage.setItem("dn_cn_dn_first", e.first);
                                }}
                                loading={loading}
                                dataKey="dnNo"
                                filters={dnFilters}
                                header={renderTableHeader('debit')}
                                globalFilterFields={['dnNo', 'description', 'customer', 'invoiceNo', 'status']}
                                emptyMessage="No Debit Notes found."
                                className="p-datatable-gridlines border-0"
                                showGridlines
                            >
                                <Column field="dnNo" header="Debit Note No" sortable style={{ minWidth: '120px' }} />
                                <Column field="date" header="Date" body={dateBodyTemplate} sortable style={{ minWidth: '120px', whiteSpace: 'nowrap' }} />
                                <Column field="description" header="Description" sortable style={{ minWidth: '150px' }} />
                                <Column field="customer" header="Customer" sortable style={{ minWidth: '200px' }} />
                                <Column field="invoiceNo" header="Invoice No" sortable style={{ minWidth: '120px' }} />
                                <Column field="amount" header="Amount" body={amountBodyTemplate} sortable className="text-end" style={{ minWidth: '120px' }} />
                                <Column field="currency" header="Currency" sortable className="text-center" style={{ minWidth: '100px' }} />
                                <Column field="status" header="Status" body={statusBodyTemplate} sortable className="text-center" style={{ minWidth: '100px' }} />
                                <Column header="Action" body={actionBodyTemplate} className="text-center" style={{ minWidth: '100px' }} />
                            </DataTable>
                        </div>
                    </Collapse>
                </div>

                {/* Credit Note Section */}
                <div className="accordion-item mb-2 border rounded">
                    <h2 className="accordion-header" id="headingCredit">
                        <button
                            className={`accordion-button ${!isCreditOpen ? 'collapsed' : ''} bg-light fw-bold`}
                            type="button"
                            onClick={() => setIsCreditOpen(!isCreditOpen)}
                            style={{ width: '100%', textAlign: 'left', padding: '1rem', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                            <span><i className="bx bx-file me-2"></i> Credit Note</span>
                            <i className={`bx ${isCreditOpen ? 'bx-chevron-up' : 'bx-chevron-down'}`}></i>
                        </button>
                    </h2>
                    <Collapse isOpen={isCreditOpen}>
                        <div className="accordion-body p-0">
                            <DataTable
                                value={creditNotes}
                                paginator
                                rows={10}
                                first={cnFirst}
                                onPage={(e) => {
                                    setCnFirst(e.first);
                                    localStorage.setItem("dn_cn_cn_first", e.first);
                                }}
                                loading={loading}
                                dataKey="cnNo"
                                filters={cnFilters}
                                header={renderTableHeader('credit')}
                                globalFilterFields={['cnNo', 'description', 'customer', 'invoiceNo', 'status']}
                                emptyMessage="No Credit Notes found."
                                className="p-datatable-gridlines border-0"
                                showGridlines
                            >
                                <Column field="cnNo" header="Credit Note No" sortable style={{ minWidth: '120px' }} />
                                <Column field="date" header="Date" body={dateBodyTemplate} sortable style={{ minWidth: '120px', whiteSpace: 'nowrap' }} />
                                <Column field="description" header="Description" sortable style={{ minWidth: '150px' }} />
                                <Column field="customer" header="Customer" sortable style={{ minWidth: '200px' }} />
                                <Column field="invoiceNo" header="Invoice No" sortable style={{ minWidth: '120px' }} />
                                <Column field="amount" header="Amount" body={amountBodyTemplate} sortable className="text-end" style={{ minWidth: '120px' }} />
                                <Column field="currency" header="Currency" sortable className="text-center" style={{ minWidth: '100px' }} />
                                <Column field="status" header="Status" body={statusBodyTemplate} sortable className="text-center" style={{ minWidth: '100px' }} />
                                <Column header="Action" body={actionBodyTemplate} className="text-center" style={{ minWidth: '100px' }} />
                            </DataTable>
                        </div>
                    </Collapse>
                </div>

            </Container>
        </div>
    );
};

export default DnCn;
