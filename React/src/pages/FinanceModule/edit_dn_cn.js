import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
    Container,
    Card,
    CardBody,
    Row,
    Col,
    Table,
    Input,
    Button
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import Select from "react-select";
import Flatpickr from "react-flatpickr";

import "flatpickr/dist/themes/material_blue.css";
// import axios from "axios"; // Removed
import { toast } from "react-toastify";
import { useParams, useLocation } from "react-router-dom";
import { getCustomersDNCN, getOutstandingInvoices, updateDebitNote, updateCreditNote, getDebitNoteById, getCreditNoteById, getLedgerCurrencies } from "../../common/data/mastersapi";

const EditDnCn = () => {
    const history = useHistory();
    const location = useLocation();

    const { id } = useParams();
    const [customerOptions, setCustomerOptions] = useState([]);
    const [currencyOptions, setCurrencyOptions] = useState([]);
    // Separate loading state if needed, or reuse one
    const [loading, setLoading] = useState(false);

    // Rows State
    const [debitRows, setDebitRows] = useState([]);
    const [creditRows, setCreditRows] = useState([]);

    useEffect(() => {
        fetchCustomers();
        fetchCurrencies();

        if (id) {
            fetchData(id);
        }
    }, [id, location]);

    const fetchCustomers = async () => {
        try {
            const response = await getCustomersDNCN();
            if (response && response.status === "success") {
                const options = response.data.map(c => ({
                    value: c.Id,
                    label: c.CustomerName
                }));
                setCustomerOptions(options);
            }
        } catch (error) {
            console.error("Error fetching customers:", error);
        }
    };

    const fetchCurrencies = async () => {
        try {
            const response = await getLedgerCurrencies();
            if (response && response.status === "success") {
                const options = response.data.map(c => ({
                    value: c.CurrencyId, // Ensure backend returns CurrencyId
                    label: c.CurrencyCode // Ensure backend returns CurrencyCode
                }));
                setCurrencyOptions(options);
            }
        } catch (error) {
            console.error("Error fetching currencies:", error);
        }
    };

    const fetchInvoices = async (customerId) => {
        if (!customerId) return [];
        try {
            const response = await getOutstandingInvoices(customerId);
            if (response && response.status) {
                return response.data.map(inv => ({
                    value: inv.invoice_no || inv.InvoiceNo || inv.InvoiceNbr,
                    label: `${inv.invoice_no || inv.InvoiceNo || inv.InvoiceNbr} (Bal: ${inv.balance_due || inv.BalanceAmount || 0})`
                }));
            }
            return [];
        } catch (error) {
            console.error("Error fetching invoices:", error);
            return [];
        }
    };

    const fetchData = async (recordId) => {
        const type = location.state?.type; // 'debit' or 'credit'
        let custMap = {};

        // Fetch customers first to resolve labels
        try {
            const cRes = await getCustomersDNCN();
            if (cRes && cRes.status === "success") {
                cRes.data.forEach(c => {
                    custMap[c.Id] = c.CustomerName;
                });
                // Also update options state if empty
                if (customerOptions.length === 0) {
                    setCustomerOptions(cRes.data.map(c => ({ value: c.Id, label: c.CustomerName })));
                }
            }
        } catch (e) {
            console.error(e);
        }

        // Try Debit Note First if type is debit or unknown
        if (type === 'debit' || !type) {
            try {
                const dnRes = await getDebitNoteById(recordId);
                if (dnRes && dnRes.status === "success") {
                    const data = dnRes.data;
                    const custLabel = custMap[data.CustomerId] || "Unknown";

                    // Fetch invoices for this customer
                    const invOptions = await fetchInvoices(data.CustomerId);
                    // Resolve invoice label
                    const invLabel = invOptions.find(i => i.value === data.InvoiceId)?.label || data.InvoiceId;

                    setDebitRows([{
                        dnId: data.DebitNoteId,
                        dnNo: data.DebitNoteNumber || data.DebitNoteNo,
                        date: new Date(data.TransactionDate || data.Date),
                        amount: data.Amount || data.DebitAmount,
                        description: data.Description,
                        customer: { value: data.CustomerId, label: custLabel },
                        invoiceNo: data.InvoiceId ? { value: data.InvoiceId, label: invLabel } : null,
                        currency: { value: data.CurrencyId, label: data.CurrencyCode || "USD" },
                        invoiceOptions: invOptions
                    }]);
                    setCreditRows([]);
                    return;
                }
            } catch (e) {
                // Not a debit note or error
            }
        }

        // Try Credit Note if type is credit or unknown (and debit failed)
        if (type === 'credit' || !type) {
            try {
                const cnRes = await getCreditNoteById(recordId);
                if (cnRes && cnRes.status === "success") {
                    const data = cnRes.data;
                    const custLabel = custMap[data.CustomerId] || "Unknown";

                    const invOptions = await fetchInvoices(data.CustomerId);
                    const invLabel = invOptions.find(i => i.value === data.InvoiceId)?.label || data.InvoiceId;

                    setCreditRows([{
                        cnId: data.CreditNoteId,
                        cnNo: data.CreditNoteNumber || data.CreditNoteNo,
                        date: new Date(data.TransactionDate || data.Date),
                        amount: data.Amount || data.CreditAmount,
                        description: data.Description,
                        customer: { value: data.CustomerId, label: custLabel },
                        invoiceNo: data.InvoiceId ? { value: data.InvoiceId, label: invLabel } : null,
                        currency: { value: data.CurrencyId, label: data.CurrencyCode || "USD" },
                        invoiceOptions: invOptions
                    }]);
                    setDebitRows([]);
                }
            } catch (e) {
                console.error("Record not found in DN or CN");
            }
        }
    };




    // Handlers for Debit Note
    const handleDebitChange = async (index, field, value) => {
        const newRows = [...debitRows];
        newRows[index][field] = value;
        if (field === "customer") {
            if (value && value.value) {
                const invOptions = await fetchInvoices(value.value);
                newRows[index].invoiceOptions = invOptions;
                newRows[index].invoiceNo = null;
            } else {
                newRows[index].invoiceOptions = [];
            }
        }
        setDebitRows(newRows);
    };

    const addDebitRow = () => {
        setDebitRows([...debitRows, { dnNo: "", date: new Date(), amount: "", description: "", customer: null, invoiceNo: null, currency: null, invoiceOptions: [] }]);
    };

    const removeDebitRow = (index) => {
        if (debitRows.length > 1) {
            const newRows = debitRows.filter((_, i) => i !== index);
            setDebitRows(newRows);
        }
    };

    // Handlers for Credit Note
    const handleCreditChange = async (index, field, value) => {
        const newRows = [...creditRows];
        newRows[index][field] = value;
        if (field === "customer") {
            if (value && value.value) {
                const invOptions = await fetchInvoices(value.value);
                newRows[index].invoiceOptions = invOptions;
                newRows[index].invoiceNo = null;
            } else {
                newRows[index].invoiceOptions = [];
            }
        }
        setCreditRows(newRows);
    };

    const addCreditRow = () => {
        setCreditRows([...creditRows, { cnNo: "", date: new Date(), amount: "", description: "", customer: null, invoiceNo: null, currency: null, invoiceOptions: [] }]);
    };

    const handleUpdateDebit = async (isSubmitted) => {
        for (const row of debitRows) {
            if (!row.dnId) continue; // Only update existing? Or create new if added? For Edit Page, mostly update.

            const payload = {
                DebitNoteId: row.dnId,
                DebitNoteNo: row.dnNo,
                Date: row.date.toISOString().split('T')[0],
                DebitAmount: parseFloat(row.amount),
                Description: row.description,
                CustomerId: row.customer.value,
                InvoiceNo: row.invoiceNo ? row.invoiceNo.value : null,
                CurrencyId: row.currency ? row.currency.value : 1, // Default or selected
                IsSubmitted: isSubmitted // or logic
            };

            try {
                await updateDebitNote(payload);
                toast.success("Debit Note updated successfully");
            } catch (e) {
                console.error("Error updating debit note", e);
                toast.error("Error updating debit note");
            }
        }
        history.push("/dn-cn");
    };

    const handleUpdateCredit = async (isSubmitted) => {
        for (const row of creditRows) {
            if (!row.cnId) continue;

            const payload = {
                CreditNoteId: row.cnId,
                CreditNoteNo: row.cnNo,
                Date: row.date.toISOString().split('T')[0],
                CreditAmount: parseFloat(row.amount),
                Description: row.description,
                CustomerId: row.customer.value,
                InvoiceNo: row.invoiceNo ? row.invoiceNo.value : null,
                CurrencyId: row.currency ? row.currency.value : 1,
                IsSubmitted: isSubmitted
            };

            try {
                await updateCreditNote(payload);
                toast.success("Credit Note updated successfully");
            } catch (e) {
                console.error("Error updating credit note", e);
                toast.error("Error updating credit note");
            }
        }
        history.push("/dn-cn");
    };

    const removeCreditRow = (index) => {
        if (creditRows.length > 1) {
            const newRows = creditRows.filter((_, i) => i !== index);
            setCreditRows(newRows);
        }
    };

    const formatAmount = (val) => {
        if (val === null || val === undefined || val === "") return "";
        const parts = val.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    };

    return (
        <div className="page-content">
            <Container fluid>
                <Breadcrumbs title="Finance" breadcrumbItem="Edit DN/CN" />

                {/* Debit Note Block */}
                <Card>
                    <CardBody>
                        <Row className="mb-4">
                            <Col lg="12">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4 className="card-title">Debit Note</h4>
                                    <Button color="primary" style={{ color: "white" }} onClick={addDebitRow}><i className="bx bx-plus"></i> Add</Button>
                                </div>
                                <div className="table-responsive">
                                    <Table className="table-bordered mb-0 align-middle">
                                        <thead>
                                            <tr>
                                                <th style={{ minWidth: '120px' }}>Debit Note No</th>
                                                <th style={{ minWidth: '120px' }}>Date</th>
                                                <th style={{ minWidth: '100px' }}>Debit Amount</th>
                                                <th style={{ minWidth: '150px' }}>Description</th>
                                                <th style={{ minWidth: '200px' }}>Customer</th>
                                                <th style={{ minWidth: '120px' }}>Invoice No</th>
                                                <th style={{ minWidth: '100px' }}>Currency</th>
                                                <th style={{ width: '40px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {debitRows.map((row, index) => (
                                                <tr key={index}>
                                                    <td className="p-1">
                                                        <Input
                                                            type="text"
                                                            bsSize="sm"
                                                            value={row.dnNo}
                                                            onChange={(e) => handleDebitChange(index, "dnNo", e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <Flatpickr
                                                            className="form-control form-control-sm d-block"
                                                            placeholder="dd-mm-yyyy"
                                                            options={{
                                                                altInput: true,
                                                                altFormat: "d-M-Y",
                                                                dateFormat: "Y-m-d",
                                                            }}
                                                            value={row.date}
                                                            onChange={(date) => handleDebitChange(index, "date", date[0])}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <Input
                                                            type="text"
                                                            bsSize="sm"
                                                            value={formatAmount(row.amount)}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/,/g, "");
                                                                if (/^\d*\.?\d*$/.test(val)) {
                                                                    handleDebitChange(index, "amount", val);
                                                                }
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <Input
                                                            type="text"
                                                            bsSize="sm"
                                                            value={row.description}
                                                            onChange={(e) => handleDebitChange(index, "description", e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <Select
                                                            value={row.customer}
                                                            onChange={(selectedOption) => handleDebitChange(index, "customer", selectedOption)}
                                                            options={customerOptions}
                                                            classNamePrefix="select"
                                                            placeholder="Select Customer"
                                                            menuPortalTarget={document.body}
                                                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <Select
                                                            value={row.invoiceNo}
                                                            onChange={(selectedOption) => handleDebitChange(index, "invoiceNo", selectedOption)}
                                                            options={row.invoiceOptions}
                                                            classNamePrefix="select"
                                                            placeholder="Select Invoice"
                                                            menuPortalTarget={document.body}
                                                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <Select
                                                            value={row.currency}
                                                            onChange={(selectedOption) => handleDebitChange(index, "currency", selectedOption)}
                                                            options={currencyOptions}
                                                            classNamePrefix="select"
                                                            placeholder="Currency"
                                                            menuPortalTarget={document.body}
                                                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                        />
                                                    </td>
                                                    <td className="text-center p-1">
                                                        {debitRows.length > 1 && (
                                                            <i className="bx bx-trash text-danger font-size-18" style={{ cursor: 'pointer' }} onClick={() => removeDebitRow(index)}></i>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan="8">
                                                    <div className="d-flex justify-content-end gap-2 mt-2">
                                                        <Button color="primary" onClick={() => handleUpdateDebit(false)}>Save</Button>
                                                        <Button color="success" onClick={() => handleUpdateDebit(true)}>Post</Button>
                                                        <Button color="danger" onClick={() => history.push("/dn-cn")}>Cancel</Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </Table>
                                </div>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>

                {/* Credit Note Block */}
                <Card>
                    <CardBody>
                        <Row>
                            <Col lg="12">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4 className="card-title">Credit Note</h4>
                                    <Button color="primary" style={{ color: "white" }} onClick={addCreditRow}><i className="bx bx-plus"></i> Add</Button>
                                </div>
                                <div className="table-responsive">
                                    <Table className="table-bordered mb-0 align-middle">
                                        <thead>
                                            <tr>
                                                <th style={{ minWidth: '120px' }}>Credit Note No</th>
                                                <th style={{ minWidth: '120px' }}>Date</th>
                                                <th style={{ minWidth: '100px' }}>Credit Amount</th>
                                                <th style={{ minWidth: '150px' }}>Description</th>
                                                <th style={{ minWidth: '200px' }}>Customer</th>
                                                <th style={{ minWidth: '120px' }}>Invoice No</th>
                                                <th style={{ minWidth: '100px' }}>Currency</th>
                                                <th style={{ width: '40px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {creditRows.map((row, index) => (
                                                <tr key={index}>
                                                    <td className="p-1">
                                                        <Input
                                                            type="text"
                                                            bsSize="sm"
                                                            value={row.cnNo}
                                                            onChange={(e) => handleCreditChange(index, "cnNo", e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <Flatpickr
                                                            className="form-control form-control-sm d-block"
                                                            placeholder="dd-mm-yyyy"
                                                            options={{
                                                                altInput: true,
                                                                altFormat: "d-M-Y",
                                                                dateFormat: "Y-m-d",
                                                            }}
                                                            value={row.date}
                                                            onChange={(date) => handleCreditChange(index, "date", date[0])}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <Input
                                                            type="text"
                                                            bsSize="sm"
                                                            value={formatAmount(row.amount)}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/,/g, "");
                                                                if (/^\d*\.?\d*$/.test(val)) {
                                                                    handleCreditChange(index, "amount", val);
                                                                }
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <Input
                                                            type="text"
                                                            bsSize="sm"
                                                            value={row.description}
                                                            onChange={(e) => handleCreditChange(index, "description", e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <Select
                                                            value={row.customer}
                                                            onChange={(selectedOption) => handleCreditChange(index, "customer", selectedOption)}
                                                            options={customerOptions}
                                                            classNamePrefix="select"
                                                            placeholder="Select Customer"
                                                            menuPortalTarget={document.body}
                                                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <Select
                                                            value={row.invoiceNo}
                                                            onChange={(selectedOption) => handleCreditChange(index, "invoiceNo", selectedOption)}
                                                            options={row.invoiceOptions}
                                                            classNamePrefix="select"
                                                            placeholder="Select Invoice"
                                                            menuPortalTarget={document.body}
                                                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <Select
                                                            value={row.currency}
                                                            onChange={(selectedOption) => handleCreditChange(index, "currency", selectedOption)}
                                                            options={currencyOptions}
                                                            classNamePrefix="select"
                                                            placeholder="Currency"
                                                            menuPortalTarget={document.body}
                                                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                        />
                                                    </td>
                                                    <td className="text-center p-1">
                                                        {creditRows.length > 1 && (
                                                            <i className="bx bx-trash text-danger font-size-18" style={{ cursor: 'pointer' }} onClick={() => removeCreditRow(index)}></i>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan="8">
                                                    <div className="d-flex justify-content-end gap-2 mt-2">
                                                        <Button color="primary" onClick={() => handleUpdateCredit(false)}>Save</Button>
                                                        <Button color="success" onClick={() => handleUpdateCredit(true)}>Post</Button>
                                                        <Button color="danger" onClick={() => history.push("/dn-cn")}>Cancel</Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </Table>
                                </div>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>
            </Container>
        </div>
    );
};

export default EditDnCn;