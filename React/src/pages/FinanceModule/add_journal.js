import React, { useState, useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
    Container,
    Card,
    CardBody,
    Row,
    Col,
    Table,
    Input,
    Button,
    Label
} from "reactstrap";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import Select from "react-select";
import axios from "axios";
import { PYTHON_API_URL } from "../../common/pyapiconfig";
import { toast } from "react-toastify";

// Helper to use query params
function useQuery() {
    return new URLSearchParams(useLocation().search);
}

const AddJournal = () => {
    const history = useHistory();
    const query = useQuery();
    const journalId = query.get("id"); // e.g. /add-journal?id=123

    // Header Form State
    const [journalDate, setJournalDate] = useState(new Date());
    const [description, setDescription] = useState("");
    const [partyType, setPartyType] = useState("customer");
    const [partyId, setPartyId] = useState(null);
    const [referenceNo, setReferenceNo] = useState("");

    // Fetched Options
    const [glCodeOptions, setGlCodeOptions] = useState([]);
    const [partyOptions, setPartyOptions] = useState([]);

    const typeOptions = [
        { value: 'Debit', label: 'Debit' },
        { value: 'Credit', label: 'Credit' }
    ];

    const [journalRows, setJournalRows] = useState([
        { id: null, partyName: null, type: { value: 'Debit', label: 'Debit' }, glCode: null, description: "", amount: "", referenceNo: "" },
    ]);

    useEffect(() => {
        const fetchGLCodes = async () => {
            try {
                const response = await axios.get(`${PYTHON_API_URL}/journal/get-gl-codes`);
                if (response.data?.status) {
                    setGlCodeOptions(response.data.data.map(gl => ({
                        value: gl.id,
                        label: `${gl.GLcode || ''} - ${gl.description || ''}`,
                        original: gl
                    })));
                }
            } catch (error) {
                console.error("Failed to fetch GL Codes:", error);
                toast.error("Failed to fetch GL Codes");
            }
        };

        fetchGLCodes();
    }, []);

    useEffect(() => {
        const fetchPartyList = async () => {
            try {
                const response = await axios.get(`${PYTHON_API_URL}/journal/get-party-list/${partyType}`);
                if (response.data?.status) {
                    setPartyOptions(response.data.data.map(party => ({
                        value: party.id,
                        label: party.name,
                        original: party
                    })));
                } else {
                    setPartyOptions([]);
                }
            } catch (error) {
                console.error(`Failed to fetch party list for ${partyType}:`, error);
                toast.error("Failed to fetch party list");
                setPartyOptions([]);
            }
        };

        fetchPartyList();
    }, [partyType]);

    // Pre-fill data if editing
    useEffect(() => {
        const fetchJournalData = async () => {
            if (!journalId || partyOptions.length === 0 || glCodeOptions.length === 0) return;
            try {
                const response = await axios.get(`${PYTHON_API_URL}/journal/get-journal/${journalId}`);
                if (response.data?.status) {
                    const data = response.data.data;
                    const header = data.header;
                    const details = data.details;

                    // Set Header Defaults
                    setJournalDate(new Date(header.journal_date));
                    setDescription(header.description || "");
                    setPartyType(header.party_type || "customer");
                    setReferenceNo(header.reference_no || "");

                    // Set main party
                    if (header.party_id) {
                        const matchedParty = partyOptions.find(p => p.value === header.party_id);
                        if (matchedParty) setPartyId(matchedParty);
                    }

                    // Map Details to journalRows format
                    if (details && details.length > 0) {
                        const prefilledRows = details.map(d => {
                            const matchedGL = glCodeOptions.find(gl => gl.original.GLcode === d.gl_code) || null;
                            return {
                                id: d.id,
                                type: { value: d.type, label: d.type },
                                glCode: matchedGL,
                                description: d.description || "",
                                amount: d.amount || "",
                                referenceNo: d.reference_no || ""
                            };
                        });
                        setJournalRows(prefilledRows);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch journal details:", error);
                toast.error("Failed to fetch journal details for Edit");
            }
        };

        fetchJournalData();
    }, [journalId, partyOptions, glCodeOptions]);


    const handleRowChange = (index, field, value) => {
        const newRows = [...journalRows];
        newRows[index][field] = value;
        setJournalRows(newRows);
    };

    const addRow = () => {
        setJournalRows([...journalRows, { id: null, type: { value: 'Debit', label: 'Debit' }, glCode: null, description: "", amount: "", referenceNo: "" }]);
    };

    const removeRow = (index) => {
        if (journalRows.length > 1) {
            const newRows = journalRows.filter((_, i) => i !== index);
            setJournalRows(newRows);
        }
    };

    const handlePartyTypeChange = (e) => {
        setPartyType(e.target.value);
        setPartyId(null);
    };

    const validatePayload = () => {
        for (let i = 0; i < journalRows.length; i++) {
            const row = journalRows[i];
            if (!row.glCode) return `Please select a GL Code for row ${i + 1}`;
            if (!row.amount || isNaN(row.amount)) return `Please enter a valid amount for row ${i + 1}`;
        }
        return null; // Valid
    };

    const handleSavePost = async (isPosted) => {
        const validationError = validatePayload();
        if (validationError) {
            toast.warn(validationError);
            return;
        }

        const detailsPayload = journalRows.map(row => ({
            id: row.id,
            gl_code: row.glCode?.original?.GLcode || null,
            type: row.type.value,
            description: row.description,
            amount: parseFloat(row.amount),
            reference_no: row.referenceNo
        }));

        const totalAmount = detailsPayload.reduce((sum, row) => sum + row.amount, 0);

        const payload = {
            journal_date: journalDate.toISOString().split('T')[0],
            description: description,
            party_type: partyType,
            party_id: partyId ? partyId.value : null,
            party_name: partyId ? partyId.label : null,
            reference_no: referenceNo,
            total_amount: totalAmount,
            status: isPosted ? "Posted" : "Saved",
            created_by: "Admin", // TODO: Replace with logged-in user context
            is_posted: isPosted ? 1 : 0,
            details: detailsPayload
        };

        try {
            if (journalId) {
                // UPDATE Route 
                const res = await axios.put(`${PYTHON_API_URL}/journal/update-journal/${journalId}`, payload);
                if (res.data.status) {
                    toast.success("Journal Updated Successfully");
                    history.push("/journal-ct");
                }
            } else {
                // CREATE Route
                const res = await axios.post(`${PYTHON_API_URL}/journal/save-journal`, payload);
                if (res.data.status) {
                    toast.success("Journal Saved Successfully");
                    history.push("/journal-ct");
                }
            }
        } catch (error) {
            console.error("Error saving journal:", error.response || error);
            toast.error(error.response?.data?.detail || "Failed to save journal");
        }
    };

    const customSelectStyles = {
        control: (base) => ({ ...base, minHeight: '32px', fontSize: '12px', borderColor: '#ced4da' }),
        menu: (base) => ({ ...base, fontSize: '12px', zIndex: 9999 }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 })
    };

    return (
        <div className="page-content">
            <Container fluid>
                <Breadcrumbs title="Finance" breadcrumbItem={journalId ? "Edit Journal" : "Add Journal"} />

                <Card>
                    <CardBody>
                        <Row className="mb-4">
                            <Col lg="12">
                                <div className="d-flex justify-content-end align-items-center gap-2 mb-3">
                                    <Button color="primary" onClick={() => handleSavePost(false)}>Save</Button>
                                    <Button color="success" onClick={() => handleSavePost(true)}>Post</Button>
                                    <Button color="danger" onClick={() => history.push("/journal-ct")}>Cancel</Button>
                                </div>

                                {/* Header Info Section */}
                                <div className="mb-4">
                                    <Row className="gy-3">
                                        <Col md="3">
                                            <Label>Date</Label>
                                            <Flatpickr
                                                className="form-control d-block"
                                                placeholder="dd-mm-yyyy"
                                                options={{
                                                    altInput: true,
                                                    altFormat: "d-M-Y",
                                                    dateFormat: "Y-m-d",
                                                }}
                                                value={journalDate}
                                                onChange={(date) => setJournalDate(date[0])}
                                            />
                                        </Col>
                                        <Col md="3">
                                            <Label>Reference No</Label>
                                            <Input
                                                type="text"
                                                value={referenceNo}
                                                onChange={(e) => setReferenceNo(e.target.value)}
                                                placeholder="Enter Header Ref No"
                                            />
                                        </Col>
                                        <Col md="6">
                                            <Label>Description</Label>
                                            <Input
                                                type="text"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Enter Journal Description"
                                            />
                                        </Col>
                                    </Row>
                                </div>

                                {/* Party Selection Section */}
                                <div className="mb-4">
                                    <h5 className="font-size-14 mb-3">Party Selection</h5>
                                    <div className="d-flex align-items-center gap-3 mb-3">
                                        <div className="form-check">
                                            <Input
                                                type="radio"
                                                name="partyType"
                                                value="customer"
                                                className="form-check-input"
                                                checked={partyType === "customer"}
                                                onChange={handlePartyTypeChange}
                                                id="partyCustomer"
                                            />
                                            <label className="form-check-label" htmlFor="partyCustomer">
                                                Customer
                                            </label>
                                        </div>
                                        <div className="form-check">
                                            <Input
                                                type="radio"
                                                name="partyType"
                                                value="supplier"
                                                className="form-check-input"
                                                checked={partyType === "supplier"}
                                                onChange={handlePartyTypeChange}
                                                id="partySupplier"
                                            />
                                            <label className="form-check-label" htmlFor="partySupplier">
                                                Supplier
                                            </label>
                                        </div>
                                        <div className="form-check">
                                            <Input
                                                type="radio"
                                                name="partyType"
                                                value="bank"
                                                className="form-check-input"
                                                checked={partyType === "bank"}
                                                onChange={handlePartyTypeChange}
                                                id="partyBank"
                                            />
                                            <label className="form-check-label" htmlFor="partyBank">
                                                Bank
                                            </label>
                                        </div>
                                    </div>
                                    <Row>
                                        <Col md="4">
                                            <Select
                                                value={partyId}
                                                onChange={setPartyId}
                                                options={partyOptions}
                                                classNamePrefix="select2-selection"
                                                placeholder={`Select ${partyType}`}
                                            />
                                        </Col>
                                    </Row>
                                </div>

                                {/* Journal Entry Table */}
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4 className="card-title">Journal Entries</h4>
                                </div>
                                <div className="table-responsive">
                                    <Table className="table-bordered mb-0">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '150px' }}>Type</th>
                                                <th style={{ width: '250px' }}>GL Code</th>
                                                <th>Description</th>
                                                <th>Amount</th>
                                                <th>Reference No</th>
                                                <th style={{ width: '40px' }} className="text-center">
                                                    <i className="bx bx-plus text-primary" style={{ cursor: 'pointer', fontSize: '18px' }} onClick={addRow}></i>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {journalRows.map((row, index) => (
                                                <tr key={index}>
                                                    <td className="p-1">
                                                        <Select
                                                            value={row.type}
                                                            onChange={(selectedOption) => handleRowChange(index, "type", selectedOption)}
                                                            options={typeOptions}
                                                            className="basic-single"
                                                            classNamePrefix="select2-selection"
                                                            placeholder="Select Type"
                                                            menuPortalTarget={document.body}
                                                            styles={customSelectStyles}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <Select
                                                            value={row.glCode}
                                                            onChange={(selectedOption) => handleRowChange(index, "glCode", selectedOption)}
                                                            options={glCodeOptions}
                                                            className="basic-single"
                                                            classNamePrefix="select2-selection"
                                                            placeholder="Select GL Code"
                                                            menuPortalTarget={document.body}
                                                            styles={customSelectStyles}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <Input
                                                            type="text"
                                                            bsSize="sm"
                                                            value={row.description}
                                                            onChange={(e) => handleRowChange(index, "description", e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <Input
                                                            type="number"
                                                            bsSize="sm"
                                                            value={row.amount}
                                                            onChange={(e) => handleRowChange(index, "amount", e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <Input
                                                            type="text"
                                                            bsSize="sm"
                                                            value={row.referenceNo}
                                                            onChange={(e) => handleRowChange(index, "referenceNo", e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="text-center p-1 align-middle">
                                                        {journalRows.length > 1 && (
                                                            <i className="bx bx-trash text-danger" style={{ cursor: 'pointer', fontSize: '18px' }} onClick={() => removeRow(index)}></i>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan="3" className="text-end fw-bold">Total</td>
                                                <td colSpan="3" className="fw-bold text-primary">
                                                    {journalRows.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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

export default AddJournal;