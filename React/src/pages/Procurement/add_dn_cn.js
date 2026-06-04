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
import { toast } from "react-toastify";
import {
    GetAllSuppliers,
    GetAllIRNList,
    getLedgerCurrencies,
    GetUoM,
    createProcurementDebitNote,
    createProcurementCreditNote,
    getItemsByInvoiceId,
    GetSupplierCurrency
} from "../../common/data/mastersapi";

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

const formatDebitNoteNo = (val) => {
    if (!val) return "";
    const clean = val.replace(/^BTG\/DN\//i, "").trim();
    if (/^\d+$/.test(clean)) {
        return `BTG/DN/${clean.padStart(4, "0")}`;
    }
    return `BTG/DN/${clean}`;
};

const formatCreditNoteNo = (val) => {
    if (!val) return "";
    const clean = val.replace(/^BTG\/CN\//i, "").trim();
    if (/^\d+$/.test(clean)) {
        return `BTG/CN/${clean.padStart(5, "0")}`;
    }
    return `BTG/CN/${clean}`;
};

const formatDateToLocal = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const ProcurementAddDnCn = () => {
    const history = useHistory();
    const user = getUserDetails();

    const [supplierOptions, setSupplierOptions] = useState([]);
    const [currencyOptions, setCurrencyOptions] = useState([]);
    const [gasOptions, setGasOptions] = useState([]);
    const [uomOptions, setUomOptions] = useState([]);

    // Debit Note Header State
    const [debitHeader, setDebitHeader] = useState({
        dnNo: "",
        supplier: null,
        date: new Date(),
        currency: null,
        invoiceOptions: []
    });

    // Debit Note Rows State
    const [debitRows, setDebitRows] = useState([
        { gas: null, qty: 1, uom: null, invoiceNo: null, unitPrice: "", amount: "", description: "", itemOptions: [] },
    ]);

    // Credit Note Header State
    const [creditHeader, setCreditHeader] = useState({
        cnNo: "",
        supplier: null,
        date: new Date(),
        currency: null,
        invoiceOptions: []
    });

    // Credit Note Rows State
    const [creditRows, setCreditRows] = useState([
        { gas: null, qty: 1, uom: null, invoiceNo: null, unitPrice: "", amount: "", description: "", itemOptions: [] },
    ]);

    useEffect(() => {
        fetchSuppliers();
        fetchCurrencies();
        fetchUOMs();
    }, []);

    const fetchGasItems = async () => {
        try {
            const data = await fetchGasListDSI(1, 0);
            if (Array.isArray(data)) {
                setGasOptions(data.map(g => ({ value: g.GasCodeId, label: g.GasName })));
            }
        } catch (e) {
            console.error("Error fetching gas items:", e);
        }
    };

    const fetchUOMs = async () => {
        try {
            const data = await GetUoM(1, 0);
            if (Array.isArray(data)) {
                setUomOptions(data.map(u => ({ value: u.UoMId, label: u.UoM })));
            }
        } catch (e) {
            console.error("Error fetching UOMs:", e);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const response = await GetAllSuppliers(1, 1);
            if (response && response.status) {
                const list = response.data || [];
                const options = list.map(s => ({
                    value: s.SupplierId || s.supplierid || s.Id,
                    label: s.SupplierName || s.suppliername
                }));
                setSupplierOptions(options);
            }
        } catch (error) {
            console.error("Error fetching suppliers:", error);
        }
    };

    const fetchCurrencies = async () => {
        try {
            const response = await getLedgerCurrencies();
            if (response && response.status === "success") {
                const allowedCodes = ["IDR", "USD", "MYR", "SGD", "CNY"];
                const options = response.data
                    .filter(c => allowedCodes.includes(c.CurrencyCode))
                    .map(c => ({
                        value: c.CurrencyId,
                        label: c.CurrencyCode
                    }));
                setCurrencyOptions(options);
            }
        } catch (error) {
            console.error("Error fetching currencies:", error);
        }
    };

    const fetchSupplierInvoices = async (supplierId) => {
        if (!supplierId) return [];
        try {
            const userId = user?.u_id || 0;
            // Calls existing IRN list API for the chosen supplier
            const response = await GetAllIRNList(1, 1, supplierId, 0, "", "", userId);
            if (response && response.status) {
                const list = response.data || [];
                return list
                    .filter(inv => parseFloat(inv.balancepaymentamount || inv.BalancePaymentAmount || 0) > 0)
                    .map(inv => ({
                        value: inv.receiptnote_hdr_id || inv.Id,
                        label: inv.invoice_no || inv.InvoiceNo || inv.receiptno || inv.receipt_no
                    }));
            }
            return [];
        } catch (error) {
            console.error("Error fetching supplier invoices:", error);
            return [];
        }
    };

    // Handlers for Debit Note Header
    const handleDebitHeaderChange = async (field, value) => {
        const newHeader = { ...debitHeader, [field]: value };
        if (field === "supplier") {
            if (value && value.value) {
                const invOptions = await fetchSupplierInvoices(value.value);
                newHeader.invoiceOptions = invOptions;

                try {
                    const currencyRes = await GetSupplierCurrency(value.value, 1);
                    if (currencyRes && currencyRes.status && currencyRes.data && currencyRes.data.length > 0) {
                        const supCurId = currencyRes.data[0].currencyid;
                        const matchedOpt = currencyOptions.find(
                            c => Number(c.value) === Number(supCurId)
                        );
                        if (matchedOpt) {
                            newHeader.currency = matchedOpt;
                        }
                    }
                } catch (e) {
                    console.error("Error auto-selecting supplier currency:", e);
                }
            } else {
                newHeader.invoiceOptions = [];
                newHeader.currency = null;
            }
        }
        setDebitHeader(newHeader);
    };

    const handleDebitChange = async (index, field, value) => {
        const newRows = [...debitRows];
        newRows[index] = { ...newRows[index], [field]: value };

        if (field === "invoiceNo") {
            if (value && value.value) {
                try {
                    const res = await getItemsByInvoiceId(value.value);
                    if (res && res.status === "success" && Array.isArray(res.data)) {
                        newRows[index].itemOptions = res.data.map(item => ({
                            value: item.ItemId || item.itemid,
                            label: item.ItemName || item.itemname,
                            uomId: item.UomId || item.uomid,
                            uomName: item.UomName || item.uomname || item.UOM,
                            unitPrice: item.UnitPrice || item.unitprice || 0
                        }));
                    } else {
                        newRows[index].itemOptions = [];
                    }
                } catch (e) {
                    console.error("Error loading invoice items:", e);
                    newRows[index].itemOptions = [];
                }
            } else {
                newRows[index].itemOptions = [];
            }
            newRows[index].gas = null;
            newRows[index].uom = null;
            newRows[index].unitPrice = "";
            newRows[index].amount = "";
        }

        if (field === "gas") {
            if (value) {
                if (value.uomId) {
                    newRows[index].uom = { value: value.uomId, label: value.uomName || "UOM" };
                }
                if (value.unitPrice !== undefined) {
                    newRows[index].unitPrice = value.unitPrice.toString();
                    const qty = parseFloat(newRows[index].qty) || 0;
                    newRows[index].amount = (qty * value.unitPrice).toString();
                }
            } else {
                newRows[index].uom = null;
                newRows[index].unitPrice = "";
                newRows[index].amount = "";
            }
        }

        if (field === "qty" || field === "unitPrice") {
            const qty = parseFloat(newRows[index].qty) || 0;
            const unitPrice = parseFloat(newRows[index].unitPrice) || 0;
            newRows[index].amount = (qty * unitPrice).toString();
        }
        setDebitRows(newRows);
    };

    const addDebitRow = () => {
        setDebitRows([...debitRows, { gas: null, qty: 1, uom: null, invoiceNo: null, unitPrice: "", amount: "", description: "", itemOptions: [] }]);
    };

    const removeDebitRow = (index) => {
        if (debitRows.length > 1) {
            setDebitRows(debitRows.filter((_, i) => i !== index));
        }
    };

    // Handlers for Credit Note Header
    const handleCreditHeaderChange = async (field, value) => {
        const newHeader = { ...creditHeader, [field]: value };
        if (field === "supplier") {
            if (value && value.value) {
                const invOptions = await fetchSupplierInvoices(value.value);
                newHeader.invoiceOptions = invOptions;

                try {
                    const currencyRes = await GetSupplierCurrency(value.value, 1);
                    if (currencyRes && currencyRes.status && currencyRes.data && currencyRes.data.length > 0) {
                        const supCurId = currencyRes.data[0].currencyid;
                        const matchedOpt = currencyOptions.find(
                            c => Number(c.value) === Number(supCurId)
                        );
                        if (matchedOpt) {
                            newHeader.currency = matchedOpt;
                        }
                    }
                } catch (e) {
                    console.error("Error auto-selecting supplier currency:", e);
                }
            } else {
                newHeader.invoiceOptions = [];
                newHeader.currency = null;
            }
        }
        setCreditHeader(newHeader);
    };

    const handleCreditChange = async (index, field, value) => {
        const newRows = [...creditRows];
        newRows[index] = { ...newRows[index], [field]: value };

        if (field === "invoiceNo") {
            if (value && value.value) {
                try {
                    const res = await getItemsByInvoiceId(value.value);
                    if (res && res.status === "success" && Array.isArray(res.data)) {
                        newRows[index].itemOptions = res.data.map(item => ({
                            value: item.ItemId || item.itemid,
                            label: item.ItemName || item.itemname,
                            uomId: item.UomId || item.uomid,
                            uomName: item.UomName || item.uomname || item.UOM,
                            unitPrice: item.UnitPrice || item.unitprice || 0
                        }));
                    } else {
                        newRows[index].itemOptions = [];
                    }
                } catch (e) {
                    console.error("Error loading invoice items:", e);
                    newRows[index].itemOptions = [];
                }
            } else {
                newRows[index].itemOptions = [];
            }
            newRows[index].gas = null;
            newRows[index].uom = null;
            newRows[index].unitPrice = "";
            newRows[index].amount = "";
        }

        if (field === "gas") {
            if (value) {
                if (value.uomId) {
                    newRows[index].uom = { value: value.uomId, label: value.uomName || "UOM" };
                }
                if (value.unitPrice !== undefined) {
                    newRows[index].unitPrice = value.unitPrice.toString();
                    const qty = parseFloat(newRows[index].qty) || 0;
                    newRows[index].amount = (qty * value.unitPrice).toString();
                }
            } else {
                newRows[index].uom = null;
                newRows[index].unitPrice = "";
                newRows[index].amount = "";
            }
        }

        if (field === "qty" || field === "unitPrice") {
            const qty = parseFloat(newRows[index].qty) || 0;
            const unitPrice = parseFloat(newRows[index].unitPrice) || 0;
            newRows[index].amount = (qty * unitPrice).toString();
        }
        setCreditRows(newRows);
    };

    const addCreditRow = () => {
        setCreditRows([...creditRows, { gas: null, qty: 1, uom: null, invoiceNo: null, unitPrice: "", amount: "", description: "", itemOptions: [] }]);
    };

    const removeCreditRow = (index) => {
        if (creditRows.length > 1) {
            setCreditRows(creditRows.filter((_, i) => i !== index));
        }
    };

    const saveBothNotes = async (isSubmitted) => {
        const isDebitAttempted = !!(debitHeader.dnNo || debitHeader.supplier || debitRows.some(row => row.amount));
        const isCreditAttempted = !!(creditHeader.cnNo || creditHeader.supplier || creditRows.some(row => row.amount));

        if (!isDebitAttempted && !isCreditAttempted) {
            toast.warning("Please fill in at least one Debit Note or Credit Note.");
            return;
        }

        let validDebitRows = [];
        if (isDebitAttempted) {
            if (!debitHeader.dnNo || !debitHeader.supplier) {
                toast.warning("Please fill required Debit Note header fields (Debit Note No, Supplier)");
                return;
            }
            validDebitRows = debitRows.filter(row => row.amount);
            if (validDebitRows.length === 0) {
                toast.warning("Please fill in the amount for at least one Debit Note line item.");
                return;
            }
        }

        let validCreditRows = [];
        if (isCreditAttempted) {
            if (!creditHeader.cnNo || !creditHeader.supplier) {
                toast.warning("Please fill required Credit Note header fields (Credit Note No, Supplier)");
                return;
            }
            validCreditRows = creditRows.filter(row => row.amount);
            if (validCreditRows.length === 0) {
                toast.warning("Please fill in the amount for at least one Credit Note line item.");
                return;
            }
        }

        let hasSavedDebitReal = false;
        let hasSavedCreditReal = false;

        if (isDebitAttempted && validDebitRows.length > 0) {
            const formattedDnNo = formatDebitNoteNo(debitHeader.dnNo);
            for (const row of validDebitRows) {
                const payload = {
                    DebitNoteNo: formattedDnNo,
                    Date: debitHeader.date ? formatDateToLocal(debitHeader.date) : formatDateToLocal(new Date()),
                    DebitAmount: parseFloat(row.amount),
                    Description: row.description || "",
                    SupplierId: debitHeader.supplier.value,
                    InvoiceNo: row.invoiceNo ? row.invoiceNo.label.split(" ")[0] : null,
                    CurrencyId: debitHeader.currency ? debitHeader.currency.value : 1,
                    GasCodeId: row.gas ? row.gas.value : 0,
                    Qty: parseFloat(row.qty) || 0,
                    UomId: row.uom ? row.uom.value : 0,
                    IsSubmitted: isSubmitted
                };
                try {
                    await createProcurementDebitNote(payload);
                    hasSavedDebitReal = true;
                } catch (e) {
                    console.error("Error saving supplier debit note", e);
                }
            }
        }

        if (isCreditAttempted && validCreditRows.length > 0) {
            const formattedCnNo = formatCreditNoteNo(creditHeader.cnNo);
            for (const row of validCreditRows) {
                const payload = {
                    CreditNoteNo: formattedCnNo,
                    Date: creditHeader.date ? formatDateToLocal(creditHeader.date) : formatDateToLocal(new Date()),
                    CreditAmount: parseFloat(row.amount),
                    Description: row.description || "",
                    SupplierId: creditHeader.supplier.value,
                    InvoiceNo: row.invoiceNo ? row.invoiceNo.label.split(" ")[0] : null,
                    CurrencyId: creditHeader.currency ? creditHeader.currency.value : 1,
                    GasCodeId: row.gas ? row.gas.value : 0,
                    Qty: parseFloat(row.qty) || 0,
                    UomId: row.uom ? row.uom.value : 0,
                    IsSubmitted: isSubmitted
                };
                try {
                    await createProcurementCreditNote(payload);
                    hasSavedCreditReal = true;
                } catch (e) {
                    console.error("Error saving supplier credit note", e);
                }
            }
        }

        if (hasSavedDebitReal && hasSavedCreditReal) {
            toast.success("Both Debit Note and Credit Note saved successfully!");
        } else if (hasSavedDebitReal) {
            toast.success("Debit Note saved successfully!");
        } else if (hasSavedCreditReal) {
            toast.success("Credit Note saved successfully!");
        } else {
            toast.success("Saved successfully!");
        }

        history.push("/procurement-dn-cn");
    };

    const handleSaveDebit = async (isSubmitted) => {
        await saveBothNotes(isSubmitted);
    };

    const handleSaveCredit = async (isSubmitted) => {
        await saveBothNotes(isSubmitted);
    };

    const formatAmountInternal = (val) => {
        if (val === null || val === undefined || val === "") return "";
        const parts = val.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    };

    return (
        <div className="page-content">
            <style>{`
                /* Chrome, Safari, Edge, Opera */
                input.no-spinner::-webkit-outer-spin-button,
                input.no-spinner::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }

                /* Firefox */
                input.no-spinner[type=number] {
                    -moz-appearance: textfield;
                }
            `}</style>
            <Container fluid>
                <Breadcrumbs title="Procurement" breadcrumbItem="Add DN/CN" />

                {/* Debit Note Block */}
                <Card>
                    <CardBody>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="card-title">Supplier Debit Note</h4>
                            <Button color="primary" style={{ color: "white" }} onClick={addDebitRow}><i className="bx bx-plus"></i> Add Line</Button>
                        </div>

                        {/* Debit Header */}
                        <Row className="mb-4">
                            <Col md={2}>
                                <label className="form-label">Debit Note No</label>
                                <Input
                                    type="text"
                                    value={debitHeader.dnNo}
                                    placeholder="Enter DN No"
                                    onChange={(e) => handleDebitHeaderChange("dnNo", e.target.value)}
                                />
                            </Col>
                            <Col md={2}>
                                <label className="form-label">Date</label>
                                <Flatpickr
                                    className="form-control d-block"
                                    placeholder="Date"
                                    options={{ altInput: true, altFormat: "d-M-Y", dateFormat: "Y-m-d" }}
                                    value={debitHeader.date}
                                    onChange={(date) => handleDebitHeaderChange("date", date[0])}
                                />
                            </Col>
                            <Col md={5}>
                                <label className="form-label">Supplier</label>
                                <Select
                                    value={debitHeader.supplier}
                                    onChange={(opt) => handleDebitHeaderChange("supplier", opt)}
                                    options={supplierOptions}
                                    placeholder="Select Supplier"
                                />
                            </Col>
                            <Col md={3}>
                                <label className="form-label">Currency</label>
                                <Select
                                    value={debitHeader.currency}
                                    onChange={(opt) => handleDebitHeaderChange("currency", opt)}
                                    options={currencyOptions}
                                    placeholder="Select Currency"
                                />
                            </Col>
                        </Row>

                        {/* Debit Grid */}
                        <div className="table-responsive">
                            <Table className="table-bordered mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: '180px', minWidth: '180px' }}>Invoice No</th>
                                        <th style={{ width: '250px', minWidth: '250px' }}>Item Name</th>
                                        <th style={{ width: '140px', minWidth: '140px' }}>UOM</th>
                                        <th style={{ width: '90px', minWidth: '90px' }}>Qty</th>
                                        <th style={{ width: '120px', minWidth: '120px' }}>Unit Price</th>
                                        <th style={{ width: '140px', minWidth: '140px' }}>Total Amount</th>
                                        <th style={{ minWidth: '220px' }}>Description</th>
                                        {debitRows.length > 1 && <th style={{ width: '40px', minWidth: '40px' }}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {debitRows.map((row, index) => (
                                        <tr key={index}>
                                            <td className="p-1" style={{ width: '180px', minWidth: '180px' }}>
                                                <Select
                                                    value={row.invoiceNo}
                                                    onChange={(opt) => handleDebitChange(index, "invoiceNo", opt)}
                                                    options={debitHeader.invoiceOptions}
                                                    placeholder="Invoice"
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
                                            </td>
                                            <td className="p-1" style={{ width: '250px', minWidth: '250px' }}>
                                                <Select
                                                    value={row.gas}
                                                    onChange={(opt) => handleDebitChange(index, "gas", opt)}
                                                    options={(row.itemOptions || []).filter(option =>
                                                        !debitRows.some((otherRow, otherIndex) =>
                                                            otherIndex !== index && otherRow.gas && String(otherRow.gas.value) === String(option.value)
                                                        )
                                                    )}
                                                    placeholder="Select Item"
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
                                            </td>
                                            <td className="p-1" style={{ width: '140px', minWidth: '140px' }}>
                                                <Select
                                                    value={row.uom}
                                                    onChange={(opt) => handleDebitChange(index, "uom", opt)}
                                                    options={uomOptions}
                                                    placeholder="UOM"
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
                                            </td>
                                            <td className="p-1" style={{ width: '90px', minWidth: '90px' }}>
                                                <Input
                                                    type="number"
                                                    bsSize="sm"
                                                    value={row.qty}
                                                    className="no-spinner"
                                                    style={{ textAlign: 'right' }}
                                                    onChange={(e) => handleDebitChange(index, "qty", e.target.value)}
                                                />
                                            </td>
                                            <td className="p-1" style={{ width: '120px', minWidth: '120px' }}>
                                                <Input
                                                    type="text"
                                                    bsSize="sm"
                                                    value={row.unitPrice}
                                                    placeholder="0.00"
                                                    style={{ textAlign: 'right' }}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (/^\d*\.?\d*$/.test(val)) handleDebitChange(index, "unitPrice", val);
                                                    }}
                                                />
                                            </td>
                                            <td className="p-1" style={{ width: '140px', minWidth: '140px' }}>
                                                <Input
                                                    type="text"
                                                    bsSize="sm"
                                                    readOnly
                                                    disabled
                                                    value={formatAmountInternal(row.amount)}
                                                    style={{ textAlign: 'right' }}
                                                />
                                            </td>
                                            <td className="p-1" style={{ minWidth: '220px' }}>
                                                <Input
                                                    type="text"
                                                    bsSize="sm"
                                                    value={row.description}
                                                    maxLength={25}
                                                    onChange={(e) => handleDebitChange(index, "description", e.target.value)}
                                                />
                                            </td>
                                            {debitRows.length > 1 && (
                                                <td className="text-center p-1" style={{ width: '40px', minWidth: '40px' }}>
                                                    <i className="bx bx-trash text-danger font-size-18" style={{ cursor: 'pointer' }} onClick={() => removeDebitRow(index)}></i>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={debitRows.length > 1 ? 8 : 7}>
                                            <div className="d-flex justify-content-end gap-2 mt-3">
                                                <Button color="primary" onClick={() => handleSaveDebit(false)}>Save</Button>
                                                <Button color="success" onClick={() => handleSaveDebit(true)}>Post</Button>
                                                <Button color="danger" onClick={() => history.push("/procurement-dn-cn")}>Cancel</Button>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </Table>
                        </div>
                    </CardBody>
                </Card>

                {/* Credit Note Block */}
                <Card>
                    <CardBody>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="card-title">Supplier Credit Note</h4>
                            <Button color="primary" style={{ color: "white" }} onClick={addCreditRow}><i className="bx bx-plus"></i> Add Line</Button>
                        </div>

                        {/* Credit Header */}
                        <Row className="mb-4">
                            <Col md={2}>
                                <label className="form-label">Credit Note No</label>
                                <Input
                                    type="text"
                                    value={creditHeader.cnNo}
                                    placeholder="Enter CN No"
                                    onChange={(e) => handleCreditHeaderChange("cnNo", e.target.value)}
                                />
                            </Col>
                            <Col md={2}>
                                <label className="form-label">Date</label>
                                <Flatpickr
                                    className="form-control d-block"
                                    placeholder="Date"
                                    options={{ altInput: true, altFormat: "d-M-Y", dateFormat: "Y-m-d" }}
                                    value={creditHeader.date}
                                    onChange={(date) => handleCreditHeaderChange("date", date[0])}
                                />
                            </Col>
                            <Col md={5}>
                                <label className="form-label">Supplier</label>
                                <Select
                                    value={creditHeader.supplier}
                                    onChange={(opt) => handleCreditHeaderChange("supplier", opt)}
                                    options={supplierOptions}
                                    placeholder="Select Supplier"
                                />
                            </Col>
                            <Col md={3}>
                                <label className="form-label">Currency</label>
                                <Select
                                    value={creditHeader.currency}
                                    onChange={(opt) => handleCreditHeaderChange("currency", opt)}
                                    options={currencyOptions}
                                    placeholder="Select Currency"
                                />
                            </Col>
                        </Row>

                        {/* Credit Grid */}
                        <div className="table-responsive">
                            <Table className="table-bordered mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: '180px', minWidth: '180px' }}>Invoice No</th>
                                        <th style={{ width: '250px', minWidth: '250px' }}>Item Name</th>
                                        <th style={{ width: '140px', minWidth: '140px' }}>UOM</th>
                                        <th style={{ width: '90px', minWidth: '90px' }}>Qty</th>
                                        <th style={{ width: '120px', minWidth: '120px' }}>Unit Price</th>
                                        <th style={{ width: '140px', minWidth: '140px' }}>Total Amount</th>
                                        <th style={{ minWidth: '220px' }}>Description</th>
                                        {creditRows.length > 1 && <th style={{ width: '40px', minWidth: '40px' }}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {creditRows.map((row, index) => (
                                        <tr key={index}>
                                            <td className="p-1" style={{ width: '180px', minWidth: '180px' }}>
                                                <Select
                                                    value={row.invoiceNo}
                                                    onChange={(opt) => handleCreditChange(index, "invoiceNo", opt)}
                                                    options={creditHeader.invoiceOptions}
                                                    placeholder="Invoice"
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
                                            </td>
                                            <td className="p-1" style={{ width: '250px', minWidth: '250px' }}>
                                                <Select
                                                    value={row.gas}
                                                    onChange={(opt) => handleCreditChange(index, "gas", opt)}
                                                    options={(row.itemOptions || []).filter(option =>
                                                        !creditRows.some((otherRow, otherIndex) =>
                                                            otherIndex !== index && otherRow.gas && String(otherRow.gas.value) === String(option.value)
                                                        )
                                                    )}
                                                    placeholder="Select Item"
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
                                            </td>
                                            <td className="p-1" style={{ width: '140px', minWidth: '140px' }}>
                                                <Select
                                                    value={row.uom}
                                                    onChange={(opt) => handleCreditChange(index, "uom", opt)}
                                                    options={uomOptions}
                                                    placeholder="UOM"
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
                                            </td>
                                            <td className="p-1" style={{ width: '90px', minWidth: '90px' }}>
                                                <Input
                                                    type="number"
                                                    bsSize="sm"
                                                    value={row.qty}
                                                    className="no-spinner"
                                                    style={{ textAlign: 'right' }}
                                                    onChange={(e) => handleCreditChange(index, "qty", e.target.value)}
                                                />
                                            </td>
                                            <td className="p-1" style={{ width: '120px', minWidth: '120px' }}>
                                                <Input
                                                    type="text"
                                                    bsSize="sm"
                                                    value={row.unitPrice}
                                                    placeholder="0.00"
                                                    style={{ textAlign: 'right' }}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (/^\d*\.?\d*$/.test(val)) handleCreditChange(index, "unitPrice", val);
                                                    }}
                                                />
                                            </td>
                                            <td className="p-1" style={{ width: '140px', minWidth: '140px' }}>
                                                <Input
                                                    type="text"
                                                    bsSize="sm"
                                                    readOnly
                                                    disabled
                                                    value={formatAmountInternal(row.amount)}
                                                    style={{ textAlign: 'right' }}
                                                />
                                            </td>
                                            <td className="p-1" style={{ minWidth: '220px' }}>
                                                <Input
                                                    type="text"
                                                    bsSize="sm"
                                                    value={row.description}
                                                    maxLength={25}
                                                    onChange={(e) => handleCreditChange(index, "description", e.target.value)}
                                                />
                                            </td>
                                            {creditRows.length > 1 && (
                                                <td className="text-center p-1" style={{ width: '40px', minWidth: '40px' }}>
                                                    <i className="bx bx-trash text-danger font-size-18" style={{ cursor: 'pointer' }} onClick={() => removeCreditRow(index)}></i>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={creditRows.length > 1 ? 8 : 7}>
                                            <div className="d-flex justify-content-end gap-2 mt-3">
                                                <Button color="primary" onClick={() => handleSaveCredit(false)}>Save</Button>
                                                <Button color="success" onClick={() => handleSaveCredit(true)}>Post</Button>
                                                <Button color="danger" onClick={() => history.push("/procurement-dn-cn")}>Cancel</Button>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </Table>
                        </div>
                    </CardBody>
                </Card>
            </Container>
        </div>
    );
};

export default ProcurementAddDnCn;
