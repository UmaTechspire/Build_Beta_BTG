import React, { useState, useEffect } from "react";
import {
    Container, Row, Col, Card, CardBody, Button,
    Modal, ModalBody, ModalHeader, ModalFooter, Label
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { FilterMatchMode, FilterOperator } from "primereact/api";
import { 
    GetBlanketPOApprovals, SaveBlanketPOApprove, GetApprovalSettings,
    GetByIdPurchaseOrder, GetPRNoBySupplierAndCurrency, GetPONOAutoComplete
} from "../../common/data/mastersapi";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";
import { Accordion, AccordionTab } from "primereact/accordion";
import * as XLSX from 'xlsx';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { Button as PrimeButton } from "primereact/button";

const btnCircleStyle = {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    padding: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
};

const BlanketPOApproval = () => {
    const [loading, setLoading] = useState(false);
    const [approvals, setApprovals] = useState([]);
    const [action1, setAction1] = useState({}); // Level 1 (GM) actions
    const [action2, setAction2] = useState({}); // Level 2 (Director) actions
    const [userData, setUserData] = useState(null);
    const [roleDetails, setRoleDetails] = useState([]);

    // Original PO Details Modal States
    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState({});

    // Blanket PO Details Modal States
    const [blanketPoViewVisible, setBlanketPoViewVisible] = useState(false);
    const [blanketPoLoading, setBlanketPoLoading] = useState(false);
    const [blanketPoViewData, setBlanketPoViewData] = useState(null);

    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        pono: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        blanketPono: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        podate: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        SupplierName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    });
    const [globalFilterValue, setGlobalFilterValue] = useState("");

    useEffect(() => {
        const authUser = localStorage.getItem("authUser");
        if (authUser) {
            const user = JSON.parse(authUser);
            setUserData(user);
            fetchAccessRights(user.u_id);
            fetchApprovals(user.u_id);
        }
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return "";
        if (typeof dateString === "string" && dateString.toLowerCase().includes("invalid")) return "";
        const parts = String(dateString).split("T")[0].split("-");
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const date = new Date(year, month, day);
            return date.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }).replace(/ /g, "-");
        }
        return dateString;
    };

    const fetchAccessRights = async (userId) => {
        const authUser = JSON.parse(localStorage.getItem("authUser"));
        const branchId = authUser?.branchId || authUser?.branchid || 1;
        const orgId = authUser?.orgId || authUser?.orgid || 1;
        const res = await GetApprovalSettings(userId, branchId, orgId, 24); 
        if (res.status) {
            setRoleDetails(res.data);
        }
    };

    const fetchApprovals = async (userId) => {
        setLoading(true);
        const authUser = JSON.parse(localStorage.getItem("authUser"));
        const branchId = authUser?.branchId || authUser?.branchid || 1;
        const orgId = authUser?.orgId || authUser?.orgid || 1;
        const res = await GetBlanketPOApprovals(branchId, orgId, userId);
        if (res.status) {
            setApprovals(res.data);

            const initialAction1 = {};
            const initialAction2 = {};
            res.data.forEach(item => {
                if (item.approvedone === 1) initialAction1[item.id] = 'approve';
                if (item.approvedtwo === 1) initialAction2[item.id] = 'approve';
            });
            setAction1(initialAction1);
            setAction2(initialAction2);
        }
        setLoading(false);
    };

    // Helper to group / pair original PO and Blanket PO on a single row
    const pairApprovals = (rawList) => {
        const pairedMap = new Map();
        
        // 1. Process all original POs or non-amendment POs first
        rawList.forEach(item => {
            const ponoStr = String(item.pono || "").trim();
            const isAmendment = /-\d+$/.test(ponoStr);
            
            if (!isAmendment) {
                pairedMap.set(ponoStr, {
                    id: item.id,
                    pono: item.pono,
                    podate: item.podate,
                    SupplierName: item.SupplierName || item.suppliername,
                    originalPoid: item.id,
                    originalNetAmount: item.NetAmount || item.netamount || 0,
                    originalQty: item.totalqty || 0,
                    blanketPono: `${item.pono}-1`,
                    blanketPoid: null,
                    blanketNetAmount: 0,
                    blanketQty: 0,
                    approvedone: item.approvedone,
                    approvedtwo: item.approvedtwo,
                    createdbyname: item.createdbyname
                });
            }
        });
        
        // 2. Process amendment POs to fill in the blanket PO fields
        rawList.forEach(item => {
            const ponoStr = String(item.pono || "").trim();
            const isAmendment = /-\d+$/.test(ponoStr);
            
            if (isAmendment) {
                const basePono = ponoStr.replace(/-\d+$/, "");
                
                if (pairedMap.has(basePono)) {
                    const existing = pairedMap.get(basePono);
                    existing.blanketPoid = item.id;
                    existing.blanketPono = item.pono;
                    existing.blanketNetAmount = item.NetAmount || item.netamount || 0;
                    existing.blanketQty = item.totalqty || 0;
                    if (existing.approvedone === 0) existing.approvedone = item.approvedone;
                    if (existing.approvedtwo === 0) existing.approvedtwo = item.approvedtwo;
                } else {
                    pairedMap.set(ponoStr, {
                        id: item.id,
                        pono: basePono,
                        podate: item.podate,
                        SupplierName: item.SupplierName || item.suppliername,
                        originalPoid: null,
                        originalNetAmount: 0,
                        originalQty: 0,
                        blanketPono: item.pono,
                        blanketPoid: item.id,
                        blanketNetAmount: item.NetAmount || item.netamount || 0,
                        blanketQty: item.totalqty || 0,
                        approvedone: item.approvedone,
                        approvedtwo: item.approvedtwo,
                        createdbyname: item.createdbyname
                    });
                }
            }
        });
        
        return Array.from(pairedMap.values());
    };

    const pairedData = pairApprovals(approvals);

    const handleActionChange = (level, id, action) => {
        if (level === 1) {
            setAction1(prev => ({ ...prev, [id]: action }));
        } else {
            setAction2(prev => ({ ...prev, [id]: action }));
        }
    };

    const ApproverIndicator = ({ approved }) => {
        if (approved === 1 || approved === true) return <i className="pi pi-check-circle text-success" style={{ fontSize: '1.2rem' }} />;
        return <i className="pi pi-circle text-secondary" style={{ fontSize: '1.2rem', opacity: '0.5' }} />;
    };

    const clearFilter = () => {
        setFilters({
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            pono: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
            blanketPono: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
            podate: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
            SupplierName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        });
        setGlobalFilterValue("");
    };

    const onGlobalFilterChange = (e) => {
        const value = e.target.value;
        setGlobalFilterValue(value);
        setFilters(prev => ({ ...prev, global: { value, matchMode: FilterMatchMode.CONTAINS } }));
    };

    const exportToExcel = () => {
        const exportData = pairedData.map(item => ({
            "PO No.": item.pono,
            "PO Quantity": item.originalQty,
            "PO Amt": item.originalNetAmount,
            "BlanketPO No.": item.blanketPono,
            "BlanketPO Quantity": item.blanketQty,
            "BlanketPO Amt": item.blanketNetAmount,
            "Supplier": item.SupplierName,
            "PO Date": item.podate,
            "GM Status": action1[item.id] === 'approve' ? "Acknowledged" : "Pending",
            "Director Status": action2[item.id] === 'approve' ? "Acknowledged" : "Pending"
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Blanket PO Acknowledge");
        XLSX.writeFile(workbook, "Blanket_PO_Acknowledge.xlsx");
    };

    const handleSaveApprovals = async () => {
        const modifiedItems = pairedData.filter(item => action1[item.id] || action2[item.id]);

        if (modifiedItems.length === 0) {
            Swal.fire("Warning", "No selections made", "warning");
            return;
        }

        const authUser = JSON.parse(localStorage.getItem("authUser"));
        const currentUserId = authUser?.u_id || userData?.u_id || 0;
        const branchId = authUser?.branchId || authUser?.branchid || 1;
        const orgId = authUser?.orgId || authUser?.orgid || 1;

        const payload = {
            approve: {
                approve: modifiedItems.map(item => ({
                    poid: item.id,
                    userid: currentUserId,
                    isapprovedone: action1[item.id] === 'approve',
                    isdiscussedone: false,
                    isapprovedtwo: action2[item.id] === 'approve',
                    isdiscussedtwo: false,
                    remarks: ""
                })),
                UserId: currentUserId,
                orgid: orgId,
                branchid: branchId
            }
        };

        try {
            const res = await SaveBlanketPOApprove(payload);
            if (res.status) {
                Swal.fire("Success", "Acknowledgements updated successfully", "success");
                fetchApprovals(userData.u_id);
            } else {
                Swal.fire("Error", res.message || "Failed to save approvals", "error");
            }
        } catch (error) {
            Swal.fire("Error", "An error occurred", "error");
        }
    };

    // Triggered when PO No is clicked
    const handleShowDetails = async (row) => {
        const authUser = JSON.parse(localStorage.getItem("authUser"));
        const branchId = authUser?.branchId || authUser?.branchid || 1;
        const orgId = authUser?.orgId || authUser?.orgid || 1;
        
        try {
            const res = await GetByIdPurchaseOrder(row.poid, orgId, branchId);
            if (res.status) {
                const supplier_id = res?.data?.Header?.supplierid;
                const currency_id = res?.data?.Header?.currencyid;
                const prList = await GetPRNoBySupplierAndCurrency(supplier_id, currency_id, orgId, branchId);
                
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

                let headerPRNumbers = [
                    ...new Set(requisition.map((r) => r.prnumber).filter(Boolean)),
                ].join(", ");

                const prIdsInOrder = requisition
                    .map(r => r.prid)
                    .filter(id => id > 0);

                if (!headerPRNumbers) headerPRNumbers = "NA";

                setSelectedDetail({
                    ...res.data,
                    Header: {
                        ...res.data.Header,
                        PRConcat: headerPRNumbers,
                        PRIdsList: prIdsInOrder,
                    },
                    Requisition: requisition,
                });

                setDetailVisible(true);
            } else {
                Swal.fire("Error", "Data is not available", "error");
            }
        } catch (error) {
            console.error("Error showing details:", error);
            Swal.fire("Error", "Something went wrong loading details", "error");
        }
    };

    // Triggered when BlanketPO NO. is clicked
    const handleBlanketPOViewClick = async (rowData) => {
        setBlanketPoLoading(true);
        setBlanketPoViewVisible(true);
        setBlanketPoViewData(null);
        
        const authUser = JSON.parse(localStorage.getItem("authUser"));
        const branchId = authUser?.branchId || authUser?.branchid || 1;
        const orgId = authUser?.orgId || authUser?.orgid || 1;

        try {
            const blanketPono = String(rowData.pono || "").trim();
            const originalPono = blanketPono.replace(/-\d+$/, "");

            const blanketRes = await GetByIdPurchaseOrder(rowData.poid, orgId, branchId);

            let originalRes = null;
            const ponoSearch = await GetPONOAutoComplete(orgId, branchId, originalPono);
            if (ponoSearch?.status && Array.isArray(ponoSearch.data) && ponoSearch.data.length > 0) {
                const matched = ponoSearch.data.find(p => String(p.pono || p.ponumber || "").trim() === originalPono);
                const poid = matched?.poid || matched?.id || ponoSearch.data[0]?.poid || ponoSearch.data[0]?.id;
                if (poid) {
                    originalRes = await GetByIdPurchaseOrder(poid, orgId, branchId);
                }
            }

            if (!blanketRes?.status) {
                Swal.fire("Error", "Could not load Blanket PO details.", "error");
                setBlanketPoViewVisible(false);
                return;
            }

            const originalCreatedByName = originalRes?.data?.Header?.createdbyName || originalRes?.data?.Header?.requestorname || "N/A";
            const blanketCreatedByName = rowData?.createdbyname || rowData?.createdbyName || blanketRes?.data?.Header?.createdbyName || blanketRes?.data?.Header?.requestorname || originalCreatedByName || "N/A";

            setBlanketPoViewData({
                originalPO: originalRes?.status ? originalRes.data : null,
                originalPono,
                originalCreatedByName,
                blanketPO: blanketRes.data,
                blanketPono,
                blanketCreatedByName,
            });
        } catch (err) {
            console.error("Error in Blanket PO view:", err);
            Swal.fire("Error", "Something went wrong.", "error");
            setBlanketPoViewVisible(false);
        } finally {
            setBlanketPoLoading(false);
        }
    };

    const renderHeader = () => {
        return (
            <div className="row align-items-center g-3 clear-spa">
                <div className="col-12 col-lg-6">
                    <Button type="button" className="btn btn-danger btn-label" onClick={clearFilter}>
                        <i className="mdi mdi-filter-off label-icon" /> Clear
                    </Button>
                </div>
                <div className="col-12 col-lg-3 text-end">
                    <span className="me-4">
                        <PrimeButton
                            icon="pi pi-check"
                            className="btn-circle p-button-rounded p-button-success"
                            style={{ ...btnCircleStyle, display: 'inline-flex', pointerEvents: 'none' }}
                        />
                        <span className="ms-1 align-middle">Acknowledged</span>
                    </span>
                </div>
                <div className="col-12 col-lg-3">
                    <input
                        className="form-control"
                        type="text"
                        placeholder="Keyword Search"
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                    />
                </div>
            </div>
        );
    };

    const header = renderHeader();

    const accordionHeader = (
        <div className="d-flex justify-content-between align-items-center w-100">
            <span>Blanket PO Acknowledge</span>
        </div>
    );

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <Breadcrumbs title="Procurement" breadcrumbItem="Acknowledge" />
                    <Row>
                        <Col lg="12">
                            <Card>
                                <CardBody>
                                    <div className="d-flex justify-content-end align-items-center mb-4 gap-3">
                                        <label className="text-danger mb-0">Please click Save button to acknowledge the selected rows</label>
                                        <Button color="primary" className="btn btn-primary" onClick={handleSaveApprovals}>
                                            <i className="bx bx-check-circle label-icon font-size-16 align-middle me-2"></i> Save
                                        </Button>
                                        <Button color="danger" className="btn btn-danger">
                                            <i className="bx bx-x-circle label-icon font-size-16 align-middle me-2"></i> Cancel
                                        </Button>
                                        <Button color="secondary" className="btn btn-secondary" onClick={exportToExcel}>
                                            <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Export
                                        </Button>
                                    </div>

                                    <Accordion activeIndex={null}>
                                        <AccordionTab header={accordionHeader}>
                                            <DataTable
                                                value={pairedData}
                                                paginator
                                                rows={20}
                                                header={header}
                                                loading={loading}
                                                filters={filters}
                                                globalFilterFields={['pono', 'blanketPono', 'SupplierName', 'podate']}
                                                emptyMessage="No pending Blanket PO acknowledgements found."
                                                responsiveLayout="scroll"
                                                className="p-datatable-sm"
                                            >
                                                <Column header="S.No" body={(rowData, { rowIndex }) => rowIndex + 1} style={{ textAlign: 'center', width: '50px' }} />
                                                
                                                {/* Original PO columns */}
                                                <Column 
                                                    field="pono" 
                                                    header="PO No." 
                                                    body={(rowData) => rowData.originalPoid ? (
                                                        <a 
                                                            href="#" 
                                                            onClick={(e) => { e.preventDefault(); handleShowDetails({ poid: rowData.originalPoid }); }} 
                                                            style={{ color: '#007bff', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}
                                                        >
                                                            {rowData.pono}
                                                        </a>
                                                    ) : rowData.pono} 
                                                    sortable 
                                                    filter 
                                                />
                                                <Column field="podate" header="PO Date" sortable filter />
                                                <Column field="SupplierName" header="Supplier" sortable filter />
                                                <Column field="originalQty" header="PO Quantity" className="text-end" sortable filter body={(rowData) => rowData.originalQty?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                                                <Column field="originalNetAmount" header="PO Amt" className="text-end" sortable filter body={(rowData) => rowData.originalNetAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />

                                                {/* Blanket PO columns */}
                                                <Column 
                                                    field="blanketPono" 
                                                    header="BlanketPO No." 
                                                    body={(rowData) => rowData.blanketPoid ? (
                                                        <a 
                                                            href="#" 
                                                            onClick={(e) => { e.preventDefault(); handleBlanketPOViewClick({ poid: rowData.blanketPoid, pono: rowData.blanketPono, createdbyname: rowData.createdbyname }); }} 
                                                            style={{ color: '#007bff', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}
                                                        >
                                                            {rowData.blanketPono}
                                                        </a>
                                                    ) : rowData.blanketPono} 
                                                    sortable 
                                                    filter 
                                                />
                                                <Column field="blanketQty" header="BlanketPO Quantity" className="text-end" sortable filter body={(rowData) => rowData.blanketQty?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                                                <Column field="blanketNetAmount" header="BlanketPO Amt" className="text-end" sortable filter body={(rowData) => rowData.blanketNetAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />

                                                <Column
                                                    header="GM"
                                                    style={{ textAlign: 'center' }}
                                                    body={(rowData) => {
                                                        const isGM = roleDetails?.[0]?.ApproverOne === 1;
                                                        const currentAction = action1[rowData.id];

                                                        if (!isGM) return <ApproverIndicator approved={rowData.approvedone} />;

                                                        return (
                                                            <div className="d-flex gap-2 justify-content-center">
                                                                <PrimeButton
                                                                    icon="pi pi-check"
                                                                    className={`btn-circle p-button-rounded ${currentAction === 'approve' ? 'p-button-success' : 'p-button-outlined'}`}
                                                                    onClick={() => handleActionChange(1, rowData.id, 'approve')}
                                                                    style={btnCircleStyle}
                                                                />
                                                            </div>
                                                        );
                                                    }}
                                                />

                                                <Column
                                                    header="Director"
                                                    style={{ textAlign: 'center' }}
                                                    body={(rowData) => {
                                                        const isDirector = roleDetails?.[0]?.ApproverTwo === 1;
                                                        const currentAction = action2[rowData.id];
                                                        const gmApproved = action1[rowData.id] === 'approve' || rowData.approvedone === 1;

                                                        if (!isDirector) return <ApproverIndicator approved={rowData.approvedtwo} />;
                                                        if (!gmApproved) return <span className="text-muted small">Waiting GM</span>;

                                                        return (
                                                            <div className="d-flex gap-2 justify-content-center">
                                                                <PrimeButton
                                                                    icon="pi pi-check"
                                                                    className={`btn-circle p-button-rounded ${currentAction === 'approve' ? 'p-button-success' : 'p-button-outlined'}`}
                                                                    onClick={() => handleActionChange(2, rowData.id, 'approve')}
                                                                    style={btnCircleStyle}
                                                                />
                                                            </div>
                                                        );
                                                    }}
                                                />
                                            </DataTable>
                                        </AccordionTab>
                                    </Accordion>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* ==================== Modal 1: Original PO Details ==================== */}
            <Modal isOpen={detailVisible} toggle={() => setDetailVisible(false)} size="xl">
                <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '15px', right: '50px', fontWeight: 'bold', color: '#333', fontSize: '12px', zIndex: 10 }}>F-BTG-PUR-06 (Rev.01)</span>
                    <ModalHeader toggle={() => setDetailVisible(false)}>Purchase Order Details</ModalHeader>
                </div>
                <ModalBody>
                    {selectedDetail && (
                        <>
                            {/* PO Header Section */}
                            <Row className="mb-3">
                                {[
                                    ["PO No.", selectedDetail.Header?.pono],
                                    ["PO Date", formatDate(selectedDetail.Header?.podate)],
                                    ["Supplier", selectedDetail.Header?.suppliername],
                                    ["Currency", selectedDetail.Header?.currencycode],
                                    ["PR No.", selectedDetail.Header?.PRConcat],
                                ].map(([label, val], i) => (
                                    <Col md="4" key={i} className="form-group row mb-2">
                                        <Label className="col-sm-5 col-form-label bold" style={{ fontWeight: 'bold' }}>{label}</Label>
                                        <Col sm="7" className="mt-2">
                                            :{" "}
                                            {label === "Supplier" ? (
                                                <b>{val || "N/A"}</b>
                                            ) : label === "Currency" ? (
                                                <span style={{ color: "green", fontWeight: "bold" }}>{val || "N/A"}</span>
                                            ) : (
                                                val || "N/A"
                                            )}
                                        </Col>
                                    </Col>
                                ))}
                            </Row>

                            <hr />

                            <p style={{ fontWeight: "bold", fontSize: "15px", marginBottom: "10px", color: "#333" }}>Purchase Order Details</p>
                            <DataTable value={selectedDetail.Requisition} className="p-datatable-sm">
                                <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} style={{ width: '50px', textAlign: 'center' }} />
                                <Column field="prnumber" header="PR No." />
                                <Column field="groupname" header="Item Group" />
                                <Column field="itemname" header="Item Name" />
                                <Column
                                    field="qty"
                                    header="Qty"
                                    className="text-end"
                                    body={(rowData) => rowData.qty?.toLocaleString("en-US", { minimumFractionDigits: 3 })}
                                />
                                <Column field="uom" header="UOM" />
                                <Column
                                    field="unitprice"
                                    header="Unit Price"
                                    className="text-end"
                                    body={(rowData) => rowData.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    footer={selectedDetail.Header?.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />
                                <Column
                                    field="discountvalue"
                                    header="Discount"
                                    className="text-end"
                                    body={(rowData) => rowData.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    footer={selectedDetail.Header?.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />
                                <Column field="taxperc" header="Tax %" className="text-center" />
                                <Column
                                    field="taxvalue"
                                    header="Tax Amt"
                                    className="text-end"
                                    body={(rowData) => rowData.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    footer={selectedDetail.Header?.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />
                                <Column field="vatperc" header="VAT %" className="text-center" />
                                <Column
                                    field="vatvalue"
                                    header="VAT Amt"
                                    className="text-end"
                                    body={(rowData) => rowData.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    footer={selectedDetail.Header?.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />
                                <Column
                                    field="nettotal"
                                    header="Total Amt"
                                    className="text-end"
                                    body={(rowData) => <span style={{ color: "#ff5a00", fontWeight: "bold" }}>{rowData.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>}
                                    footer={<b style={{ color: "#ff5a00" }}>{selectedDetail.Header?.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</b>}
                                />
                            </DataTable>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button type="button" color="danger" onClick={() => setDetailVisible(false)}>
                        Close
                    </Button>
                </ModalFooter>
            </Modal>

            {/* ==================== Modal 2: Blanket / Short Closure PO Details ==================== */}
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
                                                <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {formatDate(blanketPoViewData.originalPO.Header?.podate)}</span>
                                            </div>
                                            <div className="d-flex mb-2 align-items-center">
                                                <span style={{ minWidth: "120px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>Created Date</span>
                                                <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {formatDate(blanketPoViewData.originalPO.Header?.createddt)}</span>
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
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Qty</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>UOM</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Unit Price</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Discount</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Tax %</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Tax Amt</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>VAT %</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>VAT Amt</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Total Amt</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(blanketPoViewData.originalPO.Requisition || []).map((row, idx) => (
                                                    <tr key={idx}>
                                                        <td className="text-center">{idx + 1}</td>
                                                        <td>{row.prnumber || "N/A"}</td>
                                                        <td>{row.groupname || ""}</td>
                                                        <td>{row.itemname || ""}</td>
                                                        <td className="text-center">{parseFloat(row.qty || 0).toLocaleString("en-US", { minimumFractionDigits: 3 })}</td>
                                                        <td className="text-center">{row.uom || ""}</td>
                                                        <td className="text-center">{parseFloat(row.unitprice || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                        <td className="text-center">{parseFloat(row.discountvalue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                        <td className="text-center">{row.taxperc ?? 0}</td>
                                                        <td className="text-center">{parseFloat(row.taxvalue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                        <td className="text-center">{row.vatperc ?? 0}</td>
                                                        <td className="text-center">{parseFloat(row.vatvalue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                        <td className="text-center" style={{ color: "#ff5a00", fontWeight: "bold" }}>{parseFloat(row.nettotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                ))}
                                                {(blanketPoViewData.originalPO.Requisition || []).length === 0 && (
                                                    <tr><td colSpan={13} className="text-center text-muted">No items found</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : null}

                            {/* ====== SECTION 2: BLANKET PO ====== */}
                            {blanketPoViewData.blanketPO ? (
                                <>
                                    <hr style={{ margin: "20px 0" }} />
                                    <Row className="mb-3">
                                        <Col md={4}>
                                            <div className="d-flex mb-2 align-items-center">
                                                <span style={{ minWidth: "120px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>BlanketPO No.</span>
                                                <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {blanketPoViewData.blanketPono || "N/A"}</span>
                                            </div>
                                            <div className="d-flex mb-2 align-items-center">
                                                <span style={{ minWidth: "120px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>BlanketPO Value</span>
                                                <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {parseFloat(blanketPoViewData.blanketPO.Header?.nettotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="d-flex mb-2 align-items-center">
                                                <span style={{ minWidth: "140px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>BlanketPO Date</span>
                                                <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {formatDate(blanketPoViewData.blanketPO.Header?.podate)}</span>
                                            </div>
                                            <div className="d-flex mb-2 align-items-center">
                                                <span style={{ minWidth: "140px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>Created Date</span>
                                                <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {formatDate(blanketPoViewData.blanketPO.Header?.createddt)}</span>
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

                                    <p style={{ fontWeight: "bold", fontSize: "15px", marginTop: "15px", marginBottom: "10px", color: "#333" }}>Blanket PO Details</p>
                                    <div style={{ overflowX: "auto" }}>
                                        <table className="table table-bordered table-sm mb-0" style={{ fontSize: "12px" }}>
                                            <thead>
                                                <tr>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>#</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>BlanketPO</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Item Group</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Item Name</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Qty</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>UOM</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Unit Price</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Discount</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Tax %</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Tax Amt</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>VAT %</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>VAT Amt</th>
                                                    <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Total Amt</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(blanketPoViewData.blanketPO.Requisition || []).map((row, idx) => (
                                                    <tr key={idx}>
                                                        <td className="text-center">{idx + 1}</td>
                                                        <td>{blanketPoViewData.blanketPono}</td>
                                                        <td>{row.groupname || ""}</td>
                                                        <td>{row.itemname || ""}</td>
                                                        <td className="text-center">{parseFloat(row.qty || 0).toLocaleString("en-US", { minimumFractionDigits: 3 })}</td>
                                                        <td className="text-center">{row.uom || ""}</td>
                                                        <td className="text-center">{parseFloat(row.unitprice || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                        <td className="text-center">{parseFloat(row.discountvalue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                        <td className="text-center">{row.taxperc ?? 0}</td>
                                                        <td className="text-center">{parseFloat(row.taxvalue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                        <td className="text-center">{row.vatperc ?? 0}</td>
                                                        <td className="text-center">{parseFloat(row.vatvalue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                        <td className="text-center" style={{ color: "#ff5a00", fontWeight: "bold" }}>{parseFloat(row.nettotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                ))}
                                                {(blanketPoViewData.blanketPO.Requisition || []).length === 0 && (
                                                    <tr><td colSpan={13} className="text-center text-muted">No items found</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : null}
                        </>
                    ) : null}
                </ModalBody>
                <ModalFooter style={{ borderTop: "none" }}>
                    <Button type="button" color="danger" style={{ padding: "8px 20px" }} onClick={() => setBlanketPoViewVisible(false)}>
                        Close
                    </Button>
                </ModalFooter>
            </Modal>
        </React.Fragment>
    );
};

export default BlanketPOApproval;
