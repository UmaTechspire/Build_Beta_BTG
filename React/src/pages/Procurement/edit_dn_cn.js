import React, { useState, useEffect } from "react";
import { useHistory, useParams, useLocation } from "react-router-dom";
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
    getProcurementDebitNoteById,
    getProcurementCreditNoteById,
    updateProcurementDebitNote,
    updateProcurementCreditNote,
    getItemsByInvoiceId
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

// Fallback data for loading edits if the backend endpoints aren't running yet
const fallbackDebitNotes = [
    {
        DebitNoteId: 101,
        dnNo: "DN-PUR-0001",
        date: new Date("2026-05-20"),
        description: "Chargeback for damaged valves on arrival",
        supplierId: 1,
        invoiceNo: "IRN-00104",
        amount: 1550.00,
        currencyId: 2, // USD
        gasId: 1,
        qty: 10,
        uomId: 1
    },
    {
        DebitNoteId: 102,
        dnNo: "DN-PUR-0002",
        date: new Date("2026-05-25"),
        description: "Price discrepancy correction",
        supplierId: 2,
        invoiceNo: "IRN-00215",
        amount: 840.00,
        currencyId: 4, // SGD
        gasId: 2,
        qty: 5,
        uomId: 1
    }
];

const fallbackCreditNotes = [
    {
        CreditNoteId: 201,
        cnNo: "CN-PUR-0001",
        date: new Date("2026-05-18"),
        description: "Supplier loyalty rebate credit",
        supplierId: 2,
        invoiceNo: "IRN-00215",
        amount: 500.00,
        currencyId: 4, // SGD
        gasId: 3,
        qty: 1,
        uomId: 1
    },
    {
        CreditNoteId: 202,
        cnNo: "CN-PUR-0002",
        date: new Date("2026-05-22"),
        description: "Volume discount credit",
        supplierId: 1,
        invoiceNo: "IRN-00104",
        amount: 1200.00,
        currencyId: 2, // USD
        gasId: 1,
        qty: 12,
        uomId: 1
    }
];

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

const ProcurementEditDnCn = () => {
    const history = useHistory();
    const { id } = useParams();
    const location = useLocation();
    const user = getUserDetails();

    // Determine type: 'debit' or 'credit' passed from location state
    const type = location.state?.type || (id > 150 ? 'credit' : 'debit');

    const [supplierOptions, setSupplierOptions] = useState([]);
    const [currencyOptions, setCurrencyOptions] = useState([]);
    const [gasOptions, setGasOptions] = useState([]);
    const [uomOptions, setUomOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadedInvoiceHdrId, setLoadedInvoiceHdrId] = useState(0);

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
        const init = async () => {
            setLoading(true);
            try {
                // Fetch Master Data and Note Details in parallel
                const [suppliersRes, currenciesRes, uomsRes, noteRes] = await Promise.all([
                    GetAllSuppliers(1, 1).catch(e => { console.error(e); return null; }),
                    getLedgerCurrencies().catch(e => { console.error(e); return null; }),
                    GetUoM(1, 0).catch(e => { console.error(e); return null; }),
                    (type === 'debit' ? getProcurementDebitNoteById(id) : getProcurementCreditNoteById(id)).catch(e => { console.error(e); return null; })
                ]);

                // 1. Process Suppliers
                let supList = [];
                if (suppliersRes && suppliersRes.status) {
                    supList = suppliersRes.data || [];
                    const options = supList.map(s => ({
                        value: s.SupplierId || s.supplierid || s.Id,
                        label: s.SupplierName || s.suppliername
                    }));
                    setSupplierOptions(options);
                }
                const supplierMap = {};
                supList.forEach(s => {
                    supplierMap[s.SupplierId || s.supplierid || s.Id] = s.SupplierName || s.suppliername;
                });

                // 2. Process Currencies
                if (currenciesRes && currenciesRes.status === "success") {
                    const allowedCodes = ["IDR", "USD", "MYR", "SGD", "CNY"];
                    const options = currenciesRes.data
                        .filter(c => allowedCodes.includes(c.CurrencyCode))
                        .map(c => ({
                            value: c.CurrencyId,
                            label: c.CurrencyCode
                        }));
                    setCurrencyOptions(options);
                }

                // 3. Process UOMs
                if (Array.isArray(uomsRes)) {
                    setUomOptions(uomsRes.map(u => ({ value: u.UoMId, label: u.UoM })));
                }

                // 4. Process Note Details (Debit or Credit)
                if (type === 'debit') {
                    if (noteRes && noteRes.status === "success" && noteRes.data) {
                        const dn = noteRes.data;
                        const supOpt = { value: dn.SupplierId, label: supplierMap[dn.SupplierId] || `Supplier #${dn.SupplierId}` };
                        const currOpt = { value: dn.CurrencyId, label: dn.CurrencyCode || "USD" };
                        const invoiceHdrId = dn.InvoiceHdrId || 0;
                        setLoadedInvoiceHdrId(invoiceHdrId);

                        // Fetch dependent invoice options and items in parallel
                        const [invList, itemRes] = await Promise.all([
                            fetchSupplierInvoices(dn.SupplierId, invoiceHdrId),
                            invoiceHdrId ? getItemsByInvoiceId(invoiceHdrId).catch(e => null) : Promise.resolve(null)
                        ]);

                        setDebitHeader({
                            dnNo: dn.DebitNoteNumber || dn.DebitNoteNo || "",
                            supplier: supOpt,
                            date: dn.TransactionDate ? new Date(dn.TransactionDate) : new Date(),
                            currency: currOpt,
                            invoiceOptions: invList
                        });

                        let itemOptionsList = [];
                        if (itemRes && itemRes.status === "success" && Array.isArray(itemRes.data)) {
                            itemOptionsList = itemRes.data.map(item => ({
                                value: item.ItemId || item.itemid,
                                label: item.ItemName || item.itemname,
                                uomId: item.UomId || item.uomid,
                                uomName: item.UomName || item.uomname || item.UOM,
                                unitPrice: item.UnitPrice || item.unitprice || 0
                            }));
                        }

                        const dnAmount = parseFloat(dn.Amount || dn.DebitAmount || 0);
                        const dnQty = parseFloat(dn.Qty || 1);
                        const dnUnitPrice = dnQty > 0 ? (dnAmount / dnQty) : 0;
                        setDebitRows([{
                            gas: dn.GasCodeId ? { value: dn.GasCodeId, label: dn.GasName || "Item" } : null,
                            qty: dn.Qty || 1,
                            uom: dn.UomId ? { value: dn.UomId, label: dn.UOM || "UOM" } : null,
                            invoiceNo: dn.InvoiceNo ? { value: invoiceHdrId, label: dn.InvoiceNo } : null,
                            unitPrice: dnUnitPrice.toFixed(2),
                            amount: dnAmount.toString(),
                            description: dn.Description || "",
                            itemOptions: itemOptionsList
                        }]);
                    } else {
                        // Fallback pre-population
                        const dn = fallbackDebitNotes.find(item => item.DebitNoteId === parseInt(id)) || fallbackDebitNotes[0];
                        const supOpt = { value: dn.supplierId, label: supplierMap[dn.supplierId] || "PT HALO HALO BANDUNG" };
                        const currOpt = { value: dn.currencyId, label: dn.currencyId === 4 ? "SGD" : "USD" };
                        const invList = await fetchSupplierInvoices(dn.supplierId);

                        setDebitHeader({
                            dnNo: dn.dnNo,
                            supplier: supOpt,
                            date: dn.date,
                            currency: currOpt,
                            invoiceOptions: invList
                        });

                        const dnAmount = parseFloat(dn.amount || 0);
                        const dnQty = parseFloat(dn.qty || 1);
                        const dnUnitPrice = dnQty > 0 ? (dnAmount / dnQty) : 0;
                        setDebitRows([{
                            gas: { value: dn.gasId, label: "Neriki Valve" },
                            qty: dn.qty,
                            uom: { value: dn.uomId, label: "Pc" },
                            invoiceNo: { value: dn.invoiceNo, label: dn.invoiceNo },
                            unitPrice: dnUnitPrice.toFixed(2),
                            amount: dnAmount.toString(),
                            description: dn.description,
                            itemOptions: []
                        }]);
                    }
                } else {
                    if (noteRes && noteRes.status === "success" && noteRes.data) {
                        const cn = noteRes.data;
                        const supOpt = { value: cn.SupplierId, label: supplierMap[cn.SupplierId] || `Supplier #${cn.SupplierId}` };
                        const currOpt = { value: cn.CurrencyId, label: cn.CurrencyCode || "USD" };
                        const invoiceHdrId = cn.InvoiceHdrId || 0;
                        setLoadedInvoiceHdrId(invoiceHdrId);

                        // Fetch dependent invoice options and items in parallel
                        const [invList, itemRes] = await Promise.all([
                            fetchSupplierInvoices(cn.SupplierId, invoiceHdrId),
                            invoiceHdrId ? getItemsByInvoiceId(invoiceHdrId).catch(e => null) : Promise.resolve(null)
                        ]);

                        setCreditHeader({
                            cnNo: cn.CreditNoteNumber || cn.CreditNoteNo || "",
                            supplier: supOpt,
                            date: cn.TransactionDate ? new Date(cn.TransactionDate) : new Date(),
                            currency: currOpt,
                            invoiceOptions: invList
                        });

                        let itemOptionsList = [];
                        if (itemRes && itemRes.status === "success" && Array.isArray(itemRes.data)) {
                            itemOptionsList = itemRes.data.map(item => ({
                                value: item.ItemId || item.itemid,
                                label: item.ItemName || item.itemname,
                                uomId: item.UomId || item.uomid,
                                uomName: item.UomName || item.uomname || item.UOM,
                                unitPrice: item.UnitPrice || item.unitprice || 0
                            }));
                        }

                        const cnAmount = parseFloat(cn.Amount || cn.CreditAmount || 0);
                        const cnQty = parseFloat(cn.Qty || 1);
                        const cnUnitPrice = cnQty > 0 ? (cnAmount / cnQty) : 0;
                        setCreditRows([{
                            gas: cn.GasCodeId ? { value: cn.GasCodeId, label: cn.GasName || "Item" } : null,
                            qty: cn.Qty || 1,
                            uom: cn.UomId ? { value: cn.UomId, label: cn.UOM || "UOM" } : null,
                            invoiceNo: cn.InvoiceNo ? { value: invoiceHdrId, label: cn.InvoiceNo } : null,
                            unitPrice: cnUnitPrice.toFixed(2),
                            amount: cnAmount.toString(),
                            description: cn.Description || "",
                            itemOptions: itemOptionsList
                        }]);
                    } else {
                        // Fallback pre-population
                        const cn = fallbackCreditNotes.find(item => item.CreditNoteId === parseInt(id)) || fallbackCreditNotes[0];
                        const supOpt = { value: cn.supplierId, label: supplierMap[cn.supplierId] || "SMART TECHNOLOGY GAS PT" };
                        const currOpt = { value: cn.currencyId, label: cn.currencyId === 4 ? "SGD" : "USD" };
                        const invList = await fetchSupplierInvoices(cn.supplierId);

                        setCreditHeader({
                            cnNo: cn.cnNo,
                            supplier: supOpt,
                            date: cn.date,
                            currency: currOpt,
                            invoiceOptions: invList
                        });

                        const cnAmount = parseFloat(cn.amount || 0);
                        const cnQty = parseFloat(cn.qty || 1);
                        const cnUnitPrice = cnQty > 0 ? (cnAmount / cnQty) : 0;
                        setCreditRows([{
                            gas: { value: cn.gasId, label: "CO2 Valve c/w Safety" },
                            qty: cn.qty,
                            uom: { value: cn.uomId, label: "Pc" },
                            invoiceNo: { value: cn.invoiceNo, label: cn.invoiceNo },
                            unitPrice: cnUnitPrice.toFixed(2),
                            amount: cnAmount.toString(),
                            description: cn.description,
                            itemOptions: []
                        }]);
                    }
                }
            } catch (e) {
                console.error("Initialization error:", e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [id]);

    const fetchSupplierInvoices = async (supplierId, currentInvoiceHdrId = 0) => {
        if (!supplierId) return [];
        try {
            const userId = user?.u_id || 0;
            const response = await GetAllIRNList(1, 1, supplierId, 0, "", "", userId);
            if (response && response.status) {
                const list = response.data || [];
                return list
                    .filter(inv => {
                        const bal = parseFloat(inv.balancepaymentamount || inv.BalancePaymentAmount || 0);
                        const hdrId = inv.receiptnote_hdr_id || inv.Id;
                        return bal > 0 || hdrId === currentInvoiceHdrId || hdrId === loadedInvoiceHdrId;
                    })
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
            } else {
                newHeader.invoiceOptions = [];
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
            } else {
                newHeader.invoiceOptions = [];
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

    const handleUpdateDebit = async (isSubmitted) => {
        if (!debitHeader.dnNo || !debitHeader.supplier) {
            toast.warning("Please fill required header fields (Debit Note No, Supplier)");
            return;
        }

        const validRows = debitRows.filter(row => row.amount);
        if (validRows.length === 0) {
            toast.warning("Please fill in the amount for at least one line item.");
            return;
        }

        const formattedDnNo = formatDebitNoteNo(debitHeader.dnNo);
        let hasSavedReal = false;
        let saveError = null;
        for (const row of validRows) {
            const payload = {
                DebitNoteId: parseInt(id),
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
                const res = await updateProcurementDebitNote(payload);
                if (res && res.status === "success") {
                    hasSavedReal = true;
                } else {
                    saveError = res.message || "Failed to update debit note";
                }
            } catch (e) {
                console.error("Error updating supplier debit note", e);
                saveError = e.message || "Error updating supplier debit note";
            }
        }

        if (saveError) {
            toast.error("Failed to update Debit Note: " + saveError);
        } else {
            toast.success("Debit Note updated successfully!");
            history.push("/procurement-dn-cn");
        }
    };

    const handleUpdateCredit = async (isSubmitted) => {
        if (!creditHeader.cnNo || !creditHeader.supplier) {
            toast.warning("Please fill required header fields (Credit Note No, Supplier)");
            return;
        }

        const validRows = creditRows.filter(row => row.amount);
        if (validRows.length === 0) {
            toast.warning("Please fill in the amount for at least one line item.");
            return;
        }

        const formattedCnNo = formatCreditNoteNo(creditHeader.cnNo);
        let hasSavedReal = false;
        let saveError = null;
        for (const row of validRows) {
            const payload = {
                CreditNoteId: parseInt(id),
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
                const res = await updateProcurementCreditNote(payload);
                if (res && res.status === "success") {
                    hasSavedReal = true;
                } else {
                    saveError = res.message || "Failed to update credit note";
                }
            } catch (e) {
                console.error("Error updating supplier credit note", e);
                saveError = e.message || "Error updating supplier credit note";
            }
        }

        if (saveError) {
            toast.error("Failed to update Credit Note: " + saveError);
        } else {
            toast.success("Credit Note updated successfully!");
            history.push("/procurement-dn-cn");
        }
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
                <Breadcrumbs title="Procurement" breadcrumbItem="Edit DN/CN" />

                {/* Debit Note Block */}
                {type === 'debit' && (
                    <Card>
                        <CardBody>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h4 className="card-title">Edit Supplier Debit Note</h4>
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
                                                    <Button color="primary" onClick={() => handleUpdateDebit(false)}>Save</Button>
                                                    <Button color="success" onClick={() => handleUpdateDebit(true)}>Post</Button>
                                                    <Button color="danger" onClick={() => history.push("/procurement-dn-cn")}>Cancel</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </Table>
                            </div>
                        </CardBody>
                    </Card>
                )}

                {/* Credit Note Block */}
                {type === 'credit' && (
                    <Card>
                        <CardBody>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h4 className="card-title">Edit Supplier Credit Note</h4>
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
                                                    <Button color="primary" onClick={() => handleUpdateCredit(false)}>Save</Button>
                                                    <Button color="success" onClick={() => handleUpdateCredit(true)}>Post</Button>
                                                    <Button color="danger" onClick={() => history.push("/procurement-dn-cn")}>Cancel</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </Table>
                            </div>
                        </CardBody>
                    </Card>
                )}
            </Container>
        </div>
    );
};

export default ProcurementEditDnCn;
