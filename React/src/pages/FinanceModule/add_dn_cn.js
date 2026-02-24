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
import { getCustomersDNCN, getOutstandingInvoices, createDebitNote, createCreditNote, getLedgerCurrencies } from "../../common/data/mastersapi";


const AddDnCn = () => {
    const history = useHistory();

    const [customerOptions, setCustomerOptions] = useState([]);
    const [currencyOptions, setCurrencyOptions] = useState([]);

    useEffect(() => {
        fetchCustomers();
        fetchCurrencies();
    }, []);

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
                    value: c.CurrencyId,
                    label: c.CurrencyCode
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


    // Debit Note State
    const [debitRows, setDebitRows] = useState([
        { dnNo: "", date: new Date(), amount: "", description: "", customer: null, invoiceNo: null, currency: null, invoiceOptions: [] },
    ]);

    // Credit Note State
    const [creditRows, setCreditRows] = useState([
        { cnNo: "", date: new Date(), amount: "", description: "", customer: null, invoiceNo: null, currency: null, invoiceOptions: [] },
    ]);

    // Handlers for Debit Note
    const handleDebitChange = async (index, field, value) => {
        const newRows = [...debitRows];
        newRows[index][field] = value;

        if (field === "customer") {
            // Fetch invoices for this row
            if (value && value.value) {
                const invOptions = await fetchInvoices(value.value);
                newRows[index].invoiceOptions = invOptions;
                newRows[index].invoiceNo = null; // Reset invoice
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

    const handleSaveDebit = async (isSubmitted) => {
        // Loop through rows and save
        // Note: The API creates one by one. Bulk save? 
        // User interface has one save button for the table. I'll loop.
        for (const row of debitRows) {
            if (!row.dnNo || !row.customer || !row.amount) continue; // Basic validation

            const payload = {
                DebitNoteNo: row.dnNo,
                Date: row.date.toISOString().split('T')[0],
                DebitAmount: parseFloat(row.amount),
                Description: row.description,
                CustomerId: row.customer.value,
                InvoiceNo: row.invoiceNo ? row.invoiceNo.value : null,
                CurrencyId: row.currency ? row.currency.value : 1, // Default or selected
                IsSubmitted: isSubmitted
            };

            try {
                await createDebitNote(payload);
                toast.success("Debit Note saved successfully");
            } catch (e) {
                console.error("Error saving debit note", e);
                toast.error("Error saving debit note");
            }
        }
        history.push("/dn-cn");
    };

    const handleSaveCredit = async (isSubmitted) => {
        for (const row of creditRows) {
            if (!row.cnNo || !row.customer || !row.amount) continue;

            const payload = {
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
                await createCreditNote(payload);
                toast.success("Credit Note saved successfully");
            } catch (e) {
                console.error("Error saving credit note", e);
                toast.error("Error saving credit note");
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
                <Breadcrumbs title="Finance" breadcrumbItem="Add DN/CN" />

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
                                                        <Button color="primary" onClick={() => handleSaveDebit(false)}>Save</Button>
                                                        <Button color="success" onClick={() => handleSaveDebit(true)}>Post</Button>
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
                                                        <Button color="primary" onClick={() => handleSaveCredit(false)}>Save</Button>
                                                        <Button color="success" onClick={() => handleSaveCredit(true)}>Post</Button>
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

export default AddDnCn;