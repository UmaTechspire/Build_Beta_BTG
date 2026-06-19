import React, { useState, useEffect, useRef } from "react";
import {
    Card, CardBody, Col, Container, Row, Label, FormGroup, Modal,
    ModalBody, ModalHeader, Table, Input,
    ModalFooter
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tooltip } from "primereact/tooltip";
import 'primeicons/primeicons.css';
import { Badge } from 'primereact/badge';
import { Button } from 'primereact/button';
import { ColumnGroup } from 'primereact/columngroup';
import Select from "react-select";

const btnCircleStyle = `
.btn-circle {
    width: 20px;
    height: 20px;
    padding: 0;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #ccc;
}
.blue-table-header th {
    background-color: #3e6e9e !important;
    color: white !important;
    font-weight: bold !important;
    text-align: center;
}
.btn-close-custom {
    background-color: #c06361 !important;
    border-color: #c06361 !important;
    color: white !important;
}
.bold-label {
    font-weight: bold;
    min-width: 120px;
    color: #333;
}
.cancelled-row {
    background-color: #ffcccc !important;
    color: #990000 !important;
}
`;
import AsyncSelect from "react-select/async";
import "primereact/resources/themes/lara-light-blue/theme.css";
import { useHistory } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Tag } from "primereact/tag";
import { Dropdown } from "primereact/dropdown";
import Swal from 'sweetalert2';
import { AutoComplete } from "primereact/autocomplete";
import { MultiSelect } from "primereact/multiselect";
import SQPrintColumn from "../Order-Management/Quotation/SQPrintColumn";
import {
    GetClaimAndPaymentTransactionCurrency, GetCommonProcurementDeliveryTerms, GetCommonProcurementDepartmentDetails,
    GetCommonProcurementItemDetails, GetCommonProcurementPaymentTerms, GetCommonProcurementPRType, GetPurchaseMemoList,
    GetCommonProcurementPurchaseRequisitionSeqNo, GetCommonProcurementSupplierDetails, GetCommonProcurementUomDetails,
    GetPurchaseRequisitionUserDetails, SaveProcurementRequisition, UpdateProcurementRequisition, GetSupplierCurrency, GetByIdPurchaseRequisition,
    GetAllPurchaseOrderList,
    GetPOSupplierAutoComplete,
    GetPONOAutoComplete,
    CancelPurchaseOrder,
    GetByIdPurchaseOrder, GetCommonProcurementPRNoList, GetPRNoBySupplierAndCurrency, GetPurchaseOrderPrint, GetPORequisitionsBulk,
    ShortClosurePO, GetPendingGRNQty, GetGRNsByPO,
    GetAllPO, GetAllItems, GetGRNById, IRNGetBy, ClaimAndPaymentGetById, GetItemNameAutoComplete
} from "common/data/mastersapi";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { roundByCurrency } from "common/currencyUtils";
const initFilters = () => ({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    pono: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
    podate: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.DATE_IS }] },
    requestorname: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    suppliername: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    CreatedDate: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    createdbyName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    CurrencyCode: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    totalamount: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
});

const formatDate = (dateString) => {
    if (!dateString) return "";

    // If it's literally the string "Invalid Date", return empty
    if (typeof dateString === "string" && dateString.toLowerCase().includes("invalid")) return "";

    // Parse as local time to avoid UTC timezone shift
    const parts = String(dateString).split("T")[0].split("-");
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }).replace(/ /g, "-");
        }
    }

    // Fallback for non-ISO formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).replace(/ /g, "-");
};

const getUserDetails = () => {
    if (localStorage.getItem("authUser")) {
        const obj = JSON.parse(localStorage.getItem("authUser"))
        return obj;
    }
}
const ProcurementsManagePurchaseOrder = () => {
    const history = useHistory();

    // State
    const [gas, setGas] = useState([]); // Purchase orders
    const [pallet, setPallet] = useState([]);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState(initFilters());
    const [switchStates, setSwitchStates] = useState({});
    const [selectedRow, setSelectedRow] = useState(null);
    const [txtStatus, setTxtStatus] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isModalOpen2, setIsModalOpen2] = useState(false);
    const [cylinderTableData, setCylinderTableData] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);

    // Select props for react-select
    const [isClearable] = useState(true);
    const [isSearchable] = useState(true);
    const [isDisabled] = useState(false);
    const [isLoading] = useState(false);
    const [isRtl] = useState(false);

    // New Filter States
    const [selectedFilterType, setSelectedFilterType] = useState([]);
    const [filterPoNo, setFilterPoNo] = useState(null);
    const [filterSupplier, setFilterSupplier] = useState(null);
    const [filterCurrency, setFilterCurrency] = useState(null);
    const [filterPoDateFrom, setFilterPoDateFrom] = useState("");
    const [filterPoDateTo, setFilterPoDateTo] = useState("");
    const [filterAmountFrom, setFilterAmountFrom] = useState("");
    const [filterAmountTo, setFilterAmountTo] = useState("");
    const [filterCreatedDateFrom, setFilterCreatedDateFrom] = useState("");
    const [filterCreatedDateTo, setFilterCreatedDateTo] = useState("");
    const [filterCreatedBy, setFilterCreatedBy] = useState(null);
    const [filterItemName, setFilterItemName] = useState(null);
    const [allItemsForFilter, setAllItemsForFilter] = useState([]);
    const [allPurchaseOrders, setAllPurchaseOrders] = useState([]); // Store all for local filtering

    // NEW STATES FOR ADVANCED SEARCH
    const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
    const [advancedData, setAdvancedData] = useState([]);
    const [isAdvancedLoading, setIsAdvancedLoading] = useState(false);
    const [advancedExpandedRows, setAdvancedExpandedRows] = useState({});

    const columns = [
        { field: 'pono', header: 'PO No' },
        { field: 'podate', header: 'PO Date' },
        { field: 'suppliername', header: 'Supplier' },
        { field: 'CurrencyCode', header: 'Currency' },
        { field: 'totalamount', header: 'Total Amount' },
        { field: 'CreatedDate', header: 'Created Date' },
        { field: 'createdbyName', header: 'Created By' },
        { field: 'grn_no', header: 'GRN No' },
        { field: 'irn_no', header: 'IRN No' },
        { field: 'claim_no', header: 'Claim No' },
        { field: 'po_gm', header: 'GM' },
        { field: 'po_director', header: 'Director' },
        { field: 'print', header: 'Print' },
        { field: 'blanket_po', header: 'Blanket PO' }
    ];
    const [visibleColumns, setVisibleColumns] = useState(columns);

    const [branchId, setBranchId] = useState(1);
    const [orgId, setOrgId] = useState(1);
    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState({});
    const [poModalVisible, setPoModalVisible] = useState(false);
    const [poData, setPoData] = useState(null);
    const printRef = useRef();
    const [UserData, setUserData] = useState(null);
    const isRestrictedUser = [159, 160, 161, 163, 165].includes(UserData?.u_id);
    const [prDetailVisible, setPrDetailVisible] = useState(false);
    const [selectedPRDetail, setSelectedPRDetail] = useState(null);
    const [poOptions, setPoOptions] = useState([]);
    const [poDetailVisible, setPoDetailVisible] = useState(false);
    const [selectedPODetail, setSelectedPODetail] = useState(null);
    const [grnDetailVisible, setGrnDetailVisible] = useState(false);
    const [selectedGRNDetail, setSelectedGRNDetail] = useState(null);
    const [irnDetailVisible, setIrnDetailVisible] = useState(false);
    const [selectedIRNDetail, setSelectedIRNDetail] = useState(null);
    const [claimDetailVisible, setClaimDetailVisible] = useState(false);
    const [selectedClaimDetail, setSelectedClaimDetail] = useState(null);
    // Blanket PO View Modal (for POs ending in -1)
    const [blanketPoViewVisible, setBlanketPoViewVisible] = useState(false);
    const [blanketPoViewData, setBlanketPoViewData] = useState(null);
    const [blanketPoLoading, setBlanketPoLoading] = useState(false);

    useEffect(() => {
        const fetchItemsForFilter = async () => {
            try {
                if (orgId && branchId) {
                    // Try GetItemNameAutoComplete first as it's more specific for names
                    let res = await GetItemNameAutoComplete(orgId, branchId, "%");

                    // Fallback to GetCommonProcurementItemDetails if needed
                    if (!res?.status || !Array.isArray(res.data) || res.data.length === 0) {
                        res = await GetCommonProcurementItemDetails(0, orgId, branchId, "%");
                    }

                    // Fallback to GetAllItems if still empty
                    if (!res?.status || !Array.isArray(res.data) || res.data.length === 0) {
                        res = await GetAllItems(orgId, branchId, 0, 0, 0, 0, 0);
                    }

                    if ((res?.status || res?.Status === true) && Array.isArray(res.data)) {
                        const mappedItems = res.data.map(item => {
                            // Handle both property name variants
                            const name = item.itemname || item.itemName || item.label || item.itemdescription || item.itemDescription || "";
                            return {
                                label: name,
                                value: name
                            };
                        }).filter(item => item.label);

                        // Ensure unique labels for the dropdown
                        const seen = new Set();
                        const distinctItems = mappedItems.filter(item => {
                            if (!item.label || seen.has(item.label)) return false;
                            seen.add(item.label);
                            return true;
                        });

                        setAllItemsForFilter(distinctItems);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch items for filter", error);
            }
        };

        if (orgId && branchId) {
            fetchItemsForFilter();
        }
    }, [orgId, branchId]);

    const getSeverity = (Status) => {
        switch (Status) {
            case 'Posted': return 'success';
            case 'Saved': return 'danger';
            case 'New': return 'info';
            case 'Approved': return 'btn-success';
            case 'Discussed': return 'btn-warning';
            case 'Yet to Act': return 'btn-secondary';
            default: return 'btn-secondary';
        };
    };

    const FilterTypes = [
        { name: "PO No", value: "pono" },
        { name: "Supplier", value: "suppliername" },
        { name: "Currency", value: "CurrencyCode" },
        { name: "PO Date", value: "podate" },
        { name: "Total Amount", value: "totalamount" },
        { name: "Created Date", value: "CreatedDate" },
        { name: "Created By", value: "createdbyName" },
        { name: "Item Name", value: "itemname" }
    ];
    // const cancelFilter = async () => {
    //     try {
    //         const requestorid = '';
    //         const branchid = 1;
    //         const supplierid = 1;
    //         const orgid = 1;

    //         const result = await GetAllPurchaseOrderList(requestorid, branchid, supplierid, orgid);
    //         setPurchaseOrders(Array.isArray(result.data) ? result.data : []);
    //         setSelectedFilterType(null);
    //         setSelectedAutoItem(null);
    //     } catch (error) {
    //         console.error("Error resetting data:", error);
    //     }
    // };

    // Assuming this runs after fetching PR or PO data
    const setPOOptionsFromResponse = (response) => {
        if (response?.status && response?.data?.Header) {
            const header = response.data.Header;
            const newOption = {
                value: header.pono,   // string PO number
                label: header.pono,
                poid: header.poid      // numeric ID
            };

            setPoOptions(prev => {
                const exists = prev.find(p => p.poid === newOption.poid);
                if (exists) return prev;
                return [...prev, newOption];
            });
        }
    };

    const handlePRClick = async (prid) => {
        if (!prid || prid <= 0) {
            Swal.fire("Invalid", "No valid PR found", "warning");
            return;
        }

        try {
            const res = await GetByIdPurchaseRequisition(prid, branchId, orgId);

            if (res?.status && res.data) {
                setPOOptionsFromResponse(res);
                let details = res.data.Details || [];
                details = details.map((d) => ({
                    ...d,
                    memo_number: d.PM_Number || "NA",
                    MemoDisplay: d.PM_Number || "NA",
                }));

                const headerMemoNumbers = [...new Set(details.map(d => d.PM_Number).filter(Boolean))].join(", ") || "NA";

                setSelectedPRDetail({
                    ...res.data,
                    Header: {
                        ...res.data.Header,
                        MemoConcat: headerMemoNumbers,
                        ProjectName: 'N/A',
                    },
                    Details: details,
                });
                setPrDetailVisible(true);
            } else {
                Swal.fire("Not Found", `PR details not available (ID: ${prid})`, "warning");
            }
        } catch (err) {
            console.error("Error loading PR:", err);
            Swal.fire("Error", "Failed to load PR details", "error");
        }
    };

    // Dynamic options parsed from table data
    const getDropdownOptions = (field) => {
        const uniqueValues = [...new Set(allPurchaseOrders.map(item => item[field]).filter(Boolean))];
        return uniqueValues.map(val => ({ label: val, value: val }));
    };

    // Static data for Gas Codes and Container Types
    const [GasCodeList] = useState([
        { label: "AIR47L", value: "1", code: "1", description: "AIR 47L" },
        { label: "AMMONIA", value: "2", code: "2", description: "AMMONIA GAS" },
        { label: "AR 99.999%", value: "3", code: "3", description: "Pure Ar Grade 99.999%" },
        { label: "BLNGAS", value: "4", code: "4", description: "Balloon Gas General" },
        { label: "CGARHE", value: "5", code: "5", description: "Comp Gas Argon 25% Helium SG " },
    ]);

    const [ContainerList] = useState([
        { label: "G-PLTCYL40-16", value: "1", description: "G PLTCYL40 16" },
        { label: "G-PLTCYL47-12", value: "2", description: "G PLTCYL4 12" },
        { label: "G-PLTCYL47-15", value: "3", description: "G PLTCYL47 15" },
        { label: "G-PLTCYL47-16", value: "4", description: "G PLTCYL47 16" },
        { label: "G-PLTCYL47-17", value: "5", description: "G PLTCYL47 17" },
    ]);
    const editRow = (rowData) => {
        debugger
        console.log('Edit row:', rowData);
        history.push({
            pathname: "/procurementsadd-purchaseorder", state: { PurchaseOrderDetails: rowData }
        });
    };

    // useEffect(() => {
    //     const loadAllPOs = async () => {
    //         try {
    //             const res = await GetAllPO(branchId, orgId);
    //             if (res?.status && Array.isArray(res.data)) {
    //                 const options = res.data.map(po => ({
    //                     value: po.pono,
    //                     label: po.pono,
    //                     poid: po.poid
    //                 }));
    //                 setPoOptions(options);
    //             }
    //         } catch (err) {
    //             console.error("Failed to load POs for PONO link", err);
    //         }
    //     };
    //     loadAllPOs();
    // }, [branchId, orgId]);

    // On component mount - load purchase orders and pallets
    useEffect(() => {
        const fetchData = async () => {
            const userData = getUserDetails();

            // Don't proceed if user data is not available yet
            if (!userData || !userData.u_id) {
                console.warn("User data not available yet, skipping PO fetch");
                return;
            }

            const requestorid = 0;
            const branchid = 1;
            const supplierid = 0;
            const orgid = 1;

            try {
                const result = await GetAllPurchaseOrderList(requestorid, branchid, supplierid, orgid, userData.u_id);
                setPurchaseOrders(Array.isArray(result.data) ? result.data : []);
                setAllPurchaseOrders(Array.isArray(result.data) ? result.data : []); // Save unfiltered data

                const palletsData = getPallet();
                setPallet(palletsData);

                const initialSwitchStates = {};
                palletsData.forEach(item => {
                    initialSwitchStates[item.Code] = item.Active === 1;
                });
                setSwitchStates(initialSwitchStates);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        const userData1 = getUserDetails();
        setUserData(userData1);
        if (userData1) {
            if (userData1.orgid) setOrgId(userData1.orgid);
            if (userData1.branchid) setBranchId(userData1.branchid);
        }

        fetchData();
    }, []);

    // Pallet static data function
    const getPallet = () => {
        return [
            { Code: "00001", Palletname: "New Pallet", ContainerType: "G-PLTCYL40-16", GasCode: "AIR47L, BLNGAS, AMMONIA, CGARHE", Active: 1 },
            { Code: "00002", Palletname: "New Pallet 2", ContainerType: "G-PLTCYL40-16", GasCode: "BLNGAS, PAR 7.2M3, AR 99.999%", Active: 0 },
            { Code: "00003", Palletname: "New Pallet 3", ContainerType: "PLTCYL65-4", GasCode: "PAR 7.2M3, AMMONIA, CGARHE", Active: 1 },
            { Code: "00004", Palletname: "New Pallet 4", ContainerType: "G-PLTCYL50-4", GasCode: "CO2-GAS-25KG, AIR47L, BLNGAS, AMMONIA", Active: 0 },
        ];
    };
    // const searchData = () => {
    //     debugger
    //     const filterType = selectedFilterType?.value;

    //     // Support both object and string input
    //     const filterValue =
    //         typeof selectedAutoItem === "string"
    //             ? selectedAutoItem.toLowerCase()
    //             : selectedAutoItem?.label?.toLowerCase() || '';

    //     if (!filterType || !filterValue) return;

    //     const filteredData = purchaseOrders.filter(order => {
    //         if (filterType === 1) { // Supplier
    //             return order.suppliername?.toLowerCase().includes(filterValue);
    //         } else if (filterType === 2) { // PO No
    //             return order.pono?.toLowerCase().includes(filterValue);
    //         }
    //         return false;
    //     });

    //     setPurchaseOrders(filteredData);
    // };

    const getFilteredPurchaseOrders = async (isAdvanced = false) => {
        let result = { data: [] };
        if (allPurchaseOrders.length === 0) {
            result = await GetAllPurchaseOrderList(0, branchId, 0, orgId, UserData?.u_id);
            setAllPurchaseOrders(Array.isArray(result?.data) ? result.data : []);
        }

        let filteredData = allPurchaseOrders.length > 0 ? [...allPurchaseOrders] : Array.isArray(result?.data) ? result.data : [];

        // Apply Local Filters
        if (filterSupplier) {
            filteredData = filteredData.filter(item =>
                item.suppliername?.toLowerCase().includes(filterSupplier.label?.toLowerCase() || filterSupplier.value?.toString().toLowerCase())
            );
        }
        if (filterPoNo) {
            filteredData = filteredData.filter(item =>
                item.pono?.toLowerCase().includes(filterPoNo.value?.toLowerCase() || filterPoNo.label?.toLowerCase())
            );
        }
        if (filterCurrency) {
            filteredData = filteredData.filter(item =>
                item.CurrencyCode?.toLowerCase() === (filterCurrency.value?.toLowerCase() || filterCurrency.label?.toLowerCase())
            );
        }
        if (filterPoDateFrom) {
            const fromDate = new Date(filterPoDateFrom);
            filteredData = filteredData.filter(item => {
                const itemDate = new Date(item.podate);
                return itemDate >= fromDate;
            });
        }
        if (filterPoDateTo) {
            const toDate = new Date(filterPoDateTo);
            toDate.setHours(23, 59, 59, 999);
            filteredData = filteredData.filter(item => {
                const itemDate = new Date(item.podate);
                return itemDate <= toDate;
            });
        }
        if (filterAmountFrom) {
            filteredData = filteredData.filter(item => item.totalamount >= parseFloat(filterAmountFrom));
        }
        if (filterAmountTo) {
            filteredData = filteredData.filter(item => item.totalamount <= parseFloat(filterAmountTo));
        }
        if (filterCreatedDateFrom) {
            const fromDate = new Date(filterCreatedDateFrom);
            filteredData = filteredData.filter(item => {
                const itemDate = new Date(item.CreatedDate);
                return itemDate >= fromDate;
            });
        }
        if (filterCreatedDateTo) {
            const toDate = new Date(filterCreatedDateTo);
            toDate.setHours(23, 59, 59, 999);
            filteredData = filteredData.filter(item => {
                const itemDate = new Date(item.CreatedDate);
                return itemDate <= toDate;
            });
        }
        if (filterCreatedBy) {
            filteredData = filteredData.filter(item =>
                item.createdbyName?.toLowerCase() === (filterCreatedBy.label?.toLowerCase() || filterCreatedBy.value?.toString().toLowerCase())
            );
        }
        if (filterItemName && !isAdvanced) {
            const searchLower = (filterItemName.value || filterItemName.label || '').toLowerCase();
            filteredData = filteredData.filter(item =>
                (item.itemName || item.itemname || '').toLowerCase().includes(searchLower)
            );
        }
        return filteredData;
    };

    const searchData = async () => {
        setIsAdvancedSearch(false);
        try {
            const filteredData = await getFilteredPurchaseOrders();
            setPurchaseOrders(filteredData);
        } catch (error) {
            console.error("Error while fetching Purchase Orders:", error);
        }
    };

    const fetchAdvancedData = async () => {

        if (!selectedFilterType || selectedFilterType.length === 0) {
            Swal.fire("warning", "Please select at least one option in the 'Search By' field before proceeding an Advanced Search.", "warning");
            return;
        }

        const hasFilterValue = filterPoNo || filterSupplier || filterCurrency || filterPoDateFrom || filterPoDateTo || filterAmountFrom || filterAmountTo || filterCreatedDateFrom || filterCreatedDateTo || filterCreatedBy || filterItemName;

        if (!hasFilterValue) {
            Swal.fire("warning", "Please enter a value for the selected search criteria before proceeding an Advanced Search.", "warning");
            return;
        }

        setIsAdvancedLoading(true);
        try {
            const filteredData = await getFilteredPurchaseOrders(true);

            if (!filteredData || filteredData.length === 0) {
                setPurchaseOrders([]);
                Swal.fire("Info", "No data to show for advanced search with proper filters", "info");
                setIsAdvancedLoading(false);
                return;
            }

            // Limit mass-fetching to avoid server issues
            const MAX_AUTO_FETCH = 50;
            const posToFetch = filteredData;

            if (posToFetch.length > MAX_AUTO_FETCH && filterItemName) {
                const confirmed = await Swal.fire({
                    title: "Large Result Set",
                    text: `Searching items across ${posToFetch.length} POs may take some time. Do you want to continue?`,
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Yes, continue",
                    cancelButtonText: "No, stop"
                });
                if (!confirmed.isConfirmed) {
                    setIsAdvancedLoading(false);
                    return;
                }
            }

            // Fetch all headers and requisitions in a single bulk request
            const poids = posToFetch.map(po => po.poid);
            const bulkRes = await GetPORequisitionsBulk(poids, orgId, branchId);

            let detailedPOs = [];
            if (bulkRes?.status && bulkRes.data) {
                const headerMap = {};
                const reqMap = {};

                // Map bulk headers (poid -> paymentterm)
                if (Array.isArray(bulkRes.data.Headers)) {
                    bulkRes.data.Headers.forEach(h => {
                        headerMap[h.poid] = h.paymentterm;
                    });
                }

                // Map bulk details (poid -> list of details)
                if (Array.isArray(bulkRes.data.Requisitions)) {
                    bulkRes.data.Requisitions.forEach(r => {
                        if (!reqMap[r.poid]) reqMap[r.poid] = [];
                        reqMap[r.poid].push(r);
                    });
                }

                detailedPOs = posToFetch.map(po => {
                    return {
                        header: {
                            ...po,
                            PaymentTerm: headerMap[po.poid] || po.PaymentTerm
                        },
                        details: reqMap[po.poid] || []
                    };
                });
            } else {
                detailedPOs = posToFetch.map(po => ({ header: po, details: [] }));
            }

            if (filterItemName) {
                const searchLower = (filterItemName.value || filterItemName.label || '').toLowerCase();
                detailedPOs = detailedPOs.filter(po =>
                    po.details.some(item =>
                        (item.itemname && item.itemname.toLowerCase().includes(searchLower)) ||
                        (item.itemdescription && item.itemdescription.toLowerCase().includes(searchLower))
                    )
                );
                const matchingPOIds = new Set(detailedPOs.map(po => po.header.poid));
                setPurchaseOrders(filteredData.filter(po => matchingPOIds.has(po.poid)));
            } else {
                setPurchaseOrders(filteredData);
            }

            setAdvancedData(detailedPOs);
            const initialExpanded = {};
            detailedPOs.forEach((_, idx) => {
                initialExpanded[idx] = true;
            });
            setAdvancedExpandedRows(initialExpanded);
            setIsAdvancedSearch(true);
        } catch (error) {
            console.error("Error fetching advanced detailed POs:", error);
            Swal.fire("Error", "Failed to load advanced search data", "error");
        } finally {
            setIsAdvancedLoading(false);
        }
    };

    const cancelFilter = async () => {
        setIsAdvancedSearch(false);
        setSelectedFilterType([]);
        setFilterPoNo(null);
        setFilterSupplier(null);
        setFilterCurrency(null);
        setFilterPoDateFrom("");
        setFilterPoDateTo("");
        setFilterAmountFrom("");
        setFilterAmountTo("");
        setFilterCreatedDateFrom("");
        setFilterCreatedDateTo("");
        setFilterCreatedBy(null);
        setFilterItemName(null);

        const res = await GetAllPurchaseOrderList(0, branchId, 0, orgId, UserData?.u_id);
        if (res.status) {
            const data = Array.isArray(res.data) ? res.data : [];
            setPurchaseOrders(data);
            setAllPurchaseOrders(data);
        }
    };

    // Clear filters
    const clearFilter = () => {
        setSelectedFilterType(null);
        setFilters(initFilters());
        setGlobalFilterValue('');
    };

    // Global filter change handler
    const onGlobalFilterChange = (e) => {
        const value = e.target.value;
        setFilters(prev => ({
            ...prev,
            global: { ...prev.global, value },
        }));
        setGlobalFilterValue(value);
    };

    // Render header above table (search input + clear + tag legend)
    const renderHeader = () => (
        <div className="row align-items-center g-3 clear-spa">
            <div className="col-12 col-lg-2">
                <Button className="btn btn-danger btn-label" onClick={clearFilter}>
                    <i className="mdi mdi-filter-off label-icon" /> Clear
                </Button>
            </div>
            <div className="col-12 col-lg-8 text-end d-flex align-items-center justify-content-end gap-3 flex-wrap">
                <div className="d-flex align-items-center gap-1 text-nowrap" style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ width: '20px', height: '20px', backgroundColor: '#ffcccc', border: '1px solid #ff9999' }}></div>
                    <span className="font-size-12">Cancelled</span>
                </div>
                <div className="d-flex align-items-center gap-1 text-nowrap" style={{ whiteSpace: 'nowrap' }}>
                    <Badge style={{ width: "5px", fontSize: "13px", margin: "3px" }} value={"A"} severity={"success"} />
                    <span className="font-size-12">Blanket PO Acknowledged</span>
                </div>
                <div className="d-flex align-items-center gap-1 text-nowrap" style={{ whiteSpace: 'nowrap' }}>
                    <Badge style={{ width: "5px", fontSize: "13px", margin: "3px" }} value={"P"} severity={"danger"} />
                    <span className="font-size-12">Blanket PO Pending</span>
                </div>
                <div className="d-flex align-items-center gap-1 text-nowrap" style={{ whiteSpace: 'nowrap' }}>
                    <Tag value="S" severity="danger" /> <span className="font-size-12">Saved</span>
                </div>
                <div className="d-flex align-items-center gap-1 text-nowrap" style={{ whiteSpace: 'nowrap' }}>
                    <Tag value="P" severity="success" /> <span className="font-size-12">Posted</span>
                </div>
            </div>
            <div className="col-12 col-lg-2">
                <input
                    className="form-control"
                    type="text"
                    value={globalFilterValue}
                    onChange={onGlobalFilterChange}
                    placeholder="Keyword Search"
                />
            </div>
        </div>
    );

    const header = renderHeader();

    // Navigate to Add Purchase Order page
    const linkAddPurchaseOrder = () => {
        history.push("/procurementsadd-purchaseorder");
    };
    // Handle toggle switch change confirmation
    const onSwitchChange = () => {
        if (!selectedRow) return;

        const newStatus = !switchStates[selectedRow.Code];
        setSwitchStates(prevStates => ({
            ...prevStates,
            [selectedRow.Code]: newStatus,
        }));

        // Update pallet Active status locally
        setPallet(prevPallet =>
            prevPallet.map(p =>
                p.Code === selectedRow.Code ? { ...p, Active: newStatus ? 1 : 0 } : p
            )
        );

        console.log(`Pallet ${selectedRow.Code} Active Status:`, newStatus ? 1 : 0);
        setIsModalOpen2(false);
    };

    // Open confirmation modal for toggling Active status
    const openModal2 = (rowData) => {
        const value = rowData.Active === 1 ? "deactivate" : "activate";
        setTxtStatus(value);
        setSelectedRow(rowData);
        setIsModalOpen2(true);
    };

    // Switch toggle in the table row
    const actionBodyTemplate2 = (rowData) => (
        <input
            type="checkbox"
            className="form-check-input"
            checked={switchStates[rowData.Code] || false}
            onChange={() => openModal2(rowData)}
        />
    );

    // Modal toggle for new pallet
    const toggleModal = () => {
        setIsModalOpen(!isModalOpen);
    };

    // Validation Schema for formik
    const validationSchema = Yup.object({
        palletname: Yup.string().required("Pallet Name is required"),
        containerType: Yup.string().required("Container Type is required"),
        gasCode: Yup.string().required("Gas Code is required"),
    });

    // Submit handler for new pallet form
    const handleSubmit = (values, { resetForm }) => {
        console.log("Submitted pallet:", values);
        // Optionally add pallet to state or call API here
        resetForm();
        toggleModal();
    };

    // Handle container type change (if any side effect needed)
    const handleContainerTypeChange = (option) => {
        // Your logic here if needed
    };
    const actionBodyTemplate = (rowData) => {
        debugger
        return (
            <div className="d-flex align-items-center justify-content-center gap-3">
                {!isRestrictedUser && rowData.Status === "Saved" ? (
                    <span onClick={() => editRow(rowData)}
                        title='Edit' style={{ cursor: 'pointer' }}>
                        <i className="mdi mdi-square-edit-outline" style={{ fontSize: '1.5rem' }}></i>
                    </span>) : (
                    <span title="">
                        <i className="mdi mdi-square-edit-outline"
                            style={{ fontSize: '1.5rem', color: 'gray', opacity: 0.5 }}>
                        </i>
                    </span>
                )}

            </div>
        );
    };

    const statuses = [
        { label: "Saved", value: "Saved" },
        { label: "Posted", value: "Posted" }
    ];

    const statusBodyTemplate = (rowData) => {
        const statusShort = "P";
        return <Tag value={statusShort} severity={getSeverity("Posted")} />;
    };

    const ApproverGridIndicator = ({ approved, poid, comment }) => {
        let severity = 'danger'; // default red (Pending)
        if (approved === "A") severity = 'success';
        else if (approved === "D") severity = 'warning';

        return (
            <>
                {comment && <Tooltip target={`.badge-${poid}`} content={`Comment: ${comment}`} position="top" />}
                <Badge
                    className={comment ? `badge-${poid}` : ""}
                    value={approved}
                    severity={severity}
                    style={{ fontSize: '13px', margin: '0' }}
                />
            </>
        );
    };

    const approvalStatusTemplate = (rowData, field) => {
        const isApproved = rowData[`${field}_isapproved`] === 1 || rowData[`${field}_isapproved`] === true;
        const isDiscussed = rowData[`${field}_isdiscussed`] === 1 || rowData[`${field}_isdiscussed`] === true;
        const comment = rowData[`${field}_remarks`];

        let status = "P";
        if (isApproved) status = "A";
        else if (isDiscussed) status = "D";

        return <ApproverGridIndicator approved={status} poid={rowData.poid + field} comment={comment} />;
    };

    const statusFilterTemplate = (options) => {
        const defaultValue = "Posted";
        return <Dropdown value={defaultValue} options={statuses} onChange={(e) => options.filterCallback(e.value, options.index)}
            itemTemplate={statusItemTemplate} placeholder="Select One" className="p-column-filter" showClear />;
    };

    const statusItemTemplate = (option) => {
        return <Tag value={option.label} severity={getSeverity(option.value)} />;
    };

    // const searchData = () => {
    //     const filterType = selectedFilterType?.value || 0;
    //     const filterValue = selectedAutoItem?.value || 0;
    // };

    const handleShowDetails = async (row) => {
        const res = await GetByIdPurchaseOrder(row.poid, orgId, branchId);
        const supplier_id = res?.data?.Header?.supplierid;
        const currency_id = res?.data?.Header?.currencyid;
        // const prList = await GetCommonProcurementPRNoList(supplier_id,orgId,branchId);
        const prList = await GetPRNoBySupplierAndCurrency(supplier_id, currency_id, orgId, branchId);
        if (res.status) {
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

            // Collect unique PR numbers for header concat
            let headerPRNumbers = [
                ...new Set(requisition.map((r) => r.prnumber).filter(Boolean)),
            ].join(", ");

            // Extract PR IDs in same order (for clicking)
            const prIdsInOrder = requisition
                .map(r => r.prid)
                .filter(id => id > 0);

            if (!headerPRNumbers) headerPRNumbers = "NA";

            setSelectedDetail({
                ...res.data,
                Header: {
                    ...res.data.Header,
                    PRConcat: headerPRNumbers, // header field with PR numbers
                    PRIdsList: prIdsInOrder,
                },
                Details: requisition, // requisition rows are the detail lines
            });

            setDetailVisible(true);

            // if you later add attachments for PO
            // setPreviewUrl(res.data.Header.filepath || "");
            // setFileName(res.data.Header.filename || "");
        } else {
            Swal.fire("Error", "Data is not available", "error");
        }
    };

    const handleShowGRNDetails = async (grnid) => {
        const res = await GetGRNById(grnid, branchId, orgId);
        if (res?.status) {
            setSelectedGRNDetail(res.data);
            setGrnDetailVisible(true);
        } else {
            Swal.fire("Error", "GRN details not available", "error");
        }
    };

    const handleShowIRNDetails = async (irnid) => {
        const res = await IRNGetBy(irnid, branchId, orgId);
        if (res?.status && res.data) {
            const header = res.data.Header;
            const poid = header?.poid;

            let requisition = [];
            let poHeader = {};

            if (poid) {
                try {
                    const poRes = await GetByIdPurchaseOrder(poid, orgId, branchId);
                    if (poRes?.status && poRes.data) {
                        poHeader = poRes.data.Header || {};
                        requisition = poRes.data.Requisition || [];

                        const supplier_id = poHeader.supplierid;
                        const currency_id = poHeader.currencyid;
                        const prList = await GetPRNoBySupplierAndCurrency(supplier_id, currency_id, orgId, branchId);

                        if (prList?.data?.length > 0) {
                            requisition = requisition.map((r) => {
                                const pr = prList?.data?.find((p) => p.prid === r.prid);
                                return {
                                    ...r,
                                    prnumber: pr ? pr.pr_number : "NA",
                                    PRDisplay: pr ? pr.pr_number : "NA",
                                };
                            });
                        } else {
                            requisition = requisition.map((r) => ({
                                ...r,
                                prnumber: "NA",
                                PRDisplay: "NA",
                            }));
                        }
                    }
                } catch (err) {
                    console.error("Error loading PO details for IRN modal:", err);
                }
            }

            setSelectedIRNDetail({
                IRN_Header: {
                    irn_no: header.receipt_no || header.Receipt_No,
                    irn_date: formatDate(header.receipt_Date || header.Receipt_Date),
                    due_date: formatDate(header.due_dt || header.Due_Dt),
                    inv_date: formatDate(header.invoice_dt || header.Invoice_Dt),
                    inv_no: header.invoice_no || header.Invoice_No,
                    currency: poHeader.currencycode || header.currencycode || "NA"
                },
                Header: poHeader,
                Requisition: requisition
            });
            setIrnDetailVisible(true);
        } else {
            Swal.fire("Error", "IRN details not available", "error");
        }
    };

    const handleShowClaimDetails = async (claimid) => {
        const res = await ClaimAndPaymentGetById(claimid, orgId, branchId);
        if (res?.status) {
            let details = res.data.details || [];

            // Extract unique PO IDs that are valid
            const uniquePOIds = [...new Set(details.map(d => d.poid).filter(id => id && id > 0))];

            if (uniquePOIds.length > 0) {
                // Create a map to store PO ID -> PR Info
                const poToPrMap = {};

                // Fetch PO details for each unique PO
                await Promise.all(uniquePOIds.map(async (poid) => {
                    try {
                        const poRes = await GetByIdPurchaseOrder(poid, orgId, branchId);

                        if (poRes?.status && poRes.data?.Requisition) {
                            // The Requisition array contains the prnumber
                            const prNumbers = poRes.data.Requisition
                                .map(req => req.prnumber)
                                .filter(Boolean); // Filter out null/undefined/empty strings

                            // Join unique PR numbers
                            const prConcat = [...new Set(prNumbers)].join(", ");

                            // Also store the first PRID found for clicking purposes
                            const firstPrId = poRes.data.Requisition.find(req => req.prid > 0)?.prid;

                            poToPrMap[poid] = {
                                prnumber: prConcat || "NA",
                                prid: firstPrId
                            };
                        }
                    } catch (err) {
                        console.error(`Failed to fetch details for PO ${poid}`, err);
                    }
                }));

                // Enrich details with PR info
                details = details.map(d => {
                    if (d.poid && poToPrMap[d.poid]) {
                        return {
                            ...d,
                            prnumber: poToPrMap[d.poid].prnumber,
                            prid: poToPrMap[d.poid].prid
                        };
                    }
                    return { ...d, prnumber: "NA" };
                });
            }

            setSelectedClaimDetail({
                ...res.data,
                details: details
            });
            setClaimDetailVisible(true);
        } else {
            Swal.fire("Error", "Claim details not available", "error");
        }
    };

    const actionclaimBodyTemplate = (rowData) => {
        const isCancelled = rowData.IsCancel === 1 || rowData.IsCancel === true;
        // If pono ends with -number (e.g. PO0002680-1), this is a Blanket/Short Closure PO
        // Clicking it should open the Blanket PO History popup instead of regular detail
        const isBlanketPO = rowData.pono && /-\d+$/.test(String(rowData.pono).trim());
        return (
            <span
                style={{
                    cursor: isCancelled ? "default" : "pointer",
                    color: isCancelled ? "#990000" : "blue",
                    textDecoration: isCancelled ? "none" : "underline",
                    textAlign: "left",
                    display: "block",
                    padding: 0
                }}
                className={isCancelled ? "" : "btn-rounded btn-link p-0 text-start"}
                onClick={() => {
                    if (isCancelled) return;
                    if (isBlanketPO) {
                        handleBlanketPOViewClick(rowData);
                    } else {
                        handleShowDetails(rowData);
                    }
                }}
            >
                {rowData.pono}
            </span>
        );
    };

    const grnLinkBodyTemplate = (rowData) => {
        if (!rowData.grn_no) return "-";
        const nums = rowData.grn_no.split(", ");
        const ids = rowData.grn_ids ? rowData.grn_ids.split(",") : [];
        return (
            <div className="d-flex flex-wrap gap-1">
                {nums.map((num, i) => (
                    <span key={i} title="View GRN" className="btn btn-link p-0" style={{ cursor: 'pointer', verticalAlign: 'baseline', textDecoration: 'none' }}
                        onClick={() => ids[i] && handleShowGRNDetails(ids[i])}>
                        {num}{i < nums.length - 1 ? "," : ""}
                    </span>
                ))}
            </div>
        );
    };

    const irnLinkBodyTemplate = (rowData) => {
        if (!rowData.irn_no) return "-";
        const nums = rowData.irn_no.split(", ");
        const ids = rowData.irn_ids ? rowData.irn_ids.split(",") : [];
        return (
            <div className="d-flex flex-wrap gap-1">
                {nums.map((num, i) => (
                    <span key={i} title="View IRN" className="btn btn-link p-0" style={{ cursor: 'pointer', verticalAlign: 'baseline', textDecoration: 'none' }}
                        onClick={() => ids[i] && handleShowIRNDetails(ids[i])}>
                        {num}{i < nums.length - 1 ? "," : ""}
                    </span>
                ))}
            </div>
        );
    };

    const claimLinkBodyTemplate = (rowData) => {
        if (!rowData.claim_no) return "-";
        const nums = rowData.claim_no.split(", ");
        const ids = rowData.claim_ids ? rowData.claim_ids.split(",") : [];
        return (
            <div className="d-flex flex-wrap gap-1">
                {nums.map((num, i) => (
                    <span key={i} title="View Claim" className="btn btn-link p-0" style={{ cursor: 'pointer', verticalAlign: 'baseline', textDecoration: 'none' }}
                        onClick={() => ids[i] && handleShowClaimDetails(ids[i])}>
                        {num}{i < nums.length - 1 ? "," : ""}
                    </span>
                ))}
            </div>
        );
    };

    const fetchPOPrint = async (poid) => {
        const response = await GetPurchaseOrderPrint(poid, 1, 1);
        if (response && response.status !== false) {
            // Fetch Linked PR details to get Payment Term
            // Fetch Linked PR details to get Payment Term
            try {
                // Get PO Details to find linked PR
                const poRes = await GetByIdPurchaseOrder(poid, 1, 1);
                if (poRes?.status && poRes?.data?.Requisition?.length > 0) {
                    const firstPrId = poRes.data.Requisition[0].prid;
                    if (firstPrId) {
                        // Get PR Details
                        const prRes = await GetByIdPurchaseRequisition(firstPrId, 1, 1);
                        if (prRes?.status && prRes?.data?.Header) {
                            // Use PaymentTermName as seen in PR Details modal, fallback to others
                            const prPaymentTerm = prRes.data.Header.PaymentTermName || prRes.data.Header.paymentterm || prRes.data.Header.PaymentTerm;
                            if (prPaymentTerm) {
                                // Inject into poData header for display
                                response.data.header[0].PaymentTerm = prPaymentTerm;
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch PR Payment Term for Print", err);
            }

            setPoData(response.data); // store API response
            setPoModalVisible(true);  // open modal
        } else {
            console.error("Failed to fetch PO Print");
        }
    };

    //    const actionPOPrintBodyTemplate = (rowData) => {
    //         return (
    //             <span
    //             style={{ cursor: "pointer", color: "blue" }}
    //             className="btn-rounded btn btn-link"
    //             onClick={() => fetchPOPrint(rowData.poid)}
    //             >
    //             {rowData.pono}
    //             </span>
    //         );
    //     };

    const actionPOPrintBodyTemplate = (rowData) => {
        const isCancelled = rowData.IsCancel === 1 || rowData.IsCancel === true;
        return (
            <button
                className={`btn ${isCancelled ? "btn-secondary" : "btn-success"}`}
                style={{ cursor: isCancelled ? "not-allowed" : "pointer", color: "white" }}
                onClick={() => !isCancelled && fetchPOPrint(rowData.poid)}
                disabled={isCancelled}
                title={isCancelled ? "Cancelled PO cannot be printed" : "Print PO"}
            >
                <i className="bx bx-printer" style={{ color: "white" }}></i>
            </button>
        );
    };

    // Cancel PO handler - only for user 135
    // This will cancel the PO and reset PR approval status
    const handleDeletePO = async (rowData) => {
        Swal.fire({
            title: "Are you sure?",
            text: `This will cancel PO: ${rowData.pono} and reset the PR approval status. The PR will need to be approved again.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, cancel it!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Call cancel PO API using helper - this will cancel PO and reset PR approval
                    const response = await CancelPurchaseOrder({
                        poid: rowData.poid,
                        userId: UserData?.u_id,
                        branchId: branchId,
                        orgId: orgId
                    });
                    if (response.status) {
                        Swal.fire("Cancelled!", "Purchase Order has been cancelled and PR approval has been reset.", "success");
                        // Refresh the list
                        const resList = await GetAllPurchaseOrderList(0, branchId, 0, orgId, UserData?.u_id);
                        setPurchaseOrders(Array.isArray(resList.data) ? resList.data : []);
                        setAllPurchaseOrders(Array.isArray(resList.data) ? resList.data : []);
                    } else {
                        Swal.fire("Error", response.message || "Failed to cancel PO.", "error");
                    }
                } catch (error) {
                    console.error("Error cancelling PO:", error);
                    Swal.fire("Error", "Failed to cancel Purchase Order.", "error");
                }
            }
        });
    };

    // Delete button template - only visible to user 135
    // Enabled when PO is created, disabled if GRN is raised
    const actionDeleteBodyTemplate = (rowData) => {
        // Only show for user ID 135
        if (UserData?.u_id !== 135) {
            return null;
        }

        // Debug: Log the rowData to see available fields
        console.log("PO Row Data for delete check:", rowData);

        // Check if GRN is raised for this PO - check multiple possible field names
        // isgrnraised = 1 means GRN created, 0 means no GRN
        const isGrnRaised =
            rowData.isgrnraised === 1 ||
            rowData.IsGrnRaised === 1 ||
            rowData.IsGRNRaised === 1 ||
            rowData.isGrnRaised === 1 ||
            rowData.ISGRNRAISED === 1 ||
            rowData.grnraised === 1 ||
            rowData.GrnRaised === 1;

        const hasGrn = rowData.grn_no && rowData.grn_no !== "-" && String(rowData.grn_no).trim() !== "";
        const hasIrn = rowData.irn_no && rowData.irn_no !== "-" && String(rowData.irn_no).trim() !== "";
        const hasClaim = rowData.claim_no && rowData.claim_no !== "-" && String(rowData.claim_no).trim() !== "";

        const isShortClosureSubmitted =
            rowData.IsShortClosureSubmitted === 1 ||
            rowData.isShortClosureSubmitted === 1 ||
            rowData.IsShortClosureSubmitted === true ||
            rowData.isShortClosureSubmitted === true;

        const isShortClosed =
            rowData.IsShortClosure === 1 ||
            rowData.isShortClosure === 1 ||
            rowData.IsShortClosure === true ||
            rowData.isShortClosure === true;

        const isCancelled = rowData.IsCancel === 1 || rowData.IsCancel === true;

        const isDisabled = isGrnRaised || hasGrn || hasIrn || hasClaim || isShortClosureSubmitted || isShortClosed || isCancelled;

        return (
            <button
                className={`btn ${isDisabled ? 'btn-secondary' : 'btn-danger'}`}
                style={{ cursor: isDisabled ? "not-allowed" : "pointer", color: "white" }}
                onClick={() => !isDisabled && handleDeletePO(rowData)}
                disabled={isDisabled}
                title={isGrnRaised ? "Cannot delete - GRN already created" : isCancelled ? "PO already cancelled" : "Delete PO"}
            >
                <i className="bx bx-trash" style={{ color: "white" }}></i>
            </button>
        );
    };

    const handleBlanketPOClick = async (rowData) => {
        try {
            // Fetch pending balance quantity before showing confirmation
            let pendingQty = 0;
            const pendingRes = await GetPendingGRNQty(rowData.poid);
            if (pendingRes.status) {
                pendingQty = pendingRes.data;
            }

            if (pendingQty <= 0) {
                Swal.fire("Warning", "No balance quantity to short close.", "warning");
                return;
            }

            const confirm = await Swal.fire({
                title: "Confirmation",
                html: `Do you want to short close this PO?<br/><b>Pending GRN Balance Qty: ${pendingQty}</b>`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Yes",
                cancelButtonText: "Cancel"
            });

            if (confirm.isConfirmed) {
                const closureRes = await ShortClosurePO({
                    poid: rowData.poid,
                    userId: UserData?.u_id,
                    branchId: branchId,
                    orgId: orgId
                });

                if (closureRes.status) {
                    Swal.fire("Submitted!", "Short Closure request has been submitted for acknowledge.", "success");
                    const resList = await GetAllPurchaseOrderList(0, branchId, 0, orgId, UserData?.u_id);
                    setPurchaseOrders(Array.isArray(resList.data) ? resList.data : []);
                    setAllPurchaseOrders(Array.isArray(resList.data) ? resList.data : []);
                } else {
                    Swal.fire("Error", closureRes.message || "Failed to submit for acknowledge.", "error");
                }
            }
        } catch (error) {
            console.error("Error in Short Closure:", error);
            Swal.fire("Error", "Something went wrong.", "error");
        }
    };

    // Handles clicking the eye icon on a Blanket/Short Closure PO row (pono ends with -N)
    const handleBlanketPOViewClick = async (rowData) => {
        setBlanketPoLoading(true);
        setBlanketPoViewVisible(true);
        setBlanketPoViewData(null);
        try {
            const blanketPono = String(rowData.pono || "").trim();
            // Strip the trailing -number to get original PO number: "PO001-1" => "PO001"
            const originalPono = blanketPono.replace(/-\d+$/, "");

            // Fetch blanket PO details using its poid
            const blanketRes = await GetByIdPurchaseOrder(rowData.poid, orgId, branchId);

            // Find the original PO's poid by searching the autocomplete API
            let originalRes = null;
            let originalPoid = null;
            const ponoSearch = await GetPONOAutoComplete(orgId, branchId, originalPono);
            if (ponoSearch?.status && Array.isArray(ponoSearch.data) && ponoSearch.data.length > 0) {
                // Find exact match
                const matched = ponoSearch.data.find(p => String(p.pono || p.ponumber || "").trim() === originalPono);
                const poid = matched?.poid || matched?.id || ponoSearch.data[0]?.poid || ponoSearch.data[0]?.id;
                if (poid) {
                    originalPoid = poid;
                    originalRes = await GetByIdPurchaseOrder(poid, orgId, branchId);
                }
            }

            // Find the original PO in local state to extract its createdbyName
            const localMatch = allPurchaseOrders.find(po => String(po.pono || "").trim() === originalPono)
                || purchaseOrders.find(po => String(po.pono || "").trim() === originalPono);

            // Fallback: search in local allPurchaseOrders state if not found via API
            if (!originalRes?.status) {
                if (localMatch?.poid) {
                    originalPoid = localMatch.poid;
                    originalRes = await GetByIdPurchaseOrder(localMatch.poid, orgId, branchId);
                }
            }

            if (!blanketRes?.status) {
                Swal.fire("Error", "Could not load Blanket PO details.", "error");
                setBlanketPoViewVisible(false);
                return;
            }

            const blanketGRNsRes = originalPoid ? await GetGRNsByPO(originalPoid) : null;
            let blanketGRNs = blanketGRNsRes?.status ? blanketGRNsRes.data : [];

            const currencyCode = blanketRes.data?.Header?.currencycode || rowData.CurrencyCode || originalRes?.data?.Header?.currencycode || "IDR";

            blanketGRNs = (blanketGRNs || []).map((row) => {
                const qty = parseFloat(row.Qty) || 0;
                const unitPrice = parseFloat(row.UnitPrice) || 0;
                const discountPerc = parseFloat(row.DiscountPerc) || 0;
                const originalDiscountValue = parseFloat(row.DiscountValue) || 0;
                const poQty = parseFloat(row.POQty) || 0;
                const taxPerc = parseFloat(row.TaxPerc) || 0;
                const vatPerc = parseFloat(row.VatPerc) || 0;

                const subtotal = qty * unitPrice;
                
                let discountValue = 0;
                if (discountPerc > 0) {
                    discountValue = roundByCurrency((subtotal * discountPerc) / 100, currencyCode);
                } else if (originalDiscountValue > 0 && poQty > 0) {
                    discountValue = roundByCurrency((qty * originalDiscountValue) / poQty, currencyCode);
                }

                const lineAfterDiscount = subtotal - discountValue;
                const taxValue = roundByCurrency((lineAfterDiscount * taxPerc) / 100, currencyCode);
                const vatValue = roundByCurrency((lineAfterDiscount * vatPerc) / 100, currencyCode);

                // Withholding tax is subtracted, VAT is added
                const netTotal = roundByCurrency((lineAfterDiscount - taxValue) + vatValue, currencyCode);

                return {
                    ...row,
                    DiscountPerc: discountPerc,
                    DiscountAmt: discountValue,
                    TaxPerc: taxPerc,
                    TaxAmt: taxValue,
                    VatPerc: vatPerc,
                    VatAmt: vatValue,
                    NetTotal: netTotal
                };
            });

            const originalCreatedByName = localMatch?.createdbyName || originalRes?.data?.Header?.createdbyName || originalRes?.data?.Header?.requestorname || "N/A";
            const blanketCreatedByName = rowData?.createdbyName || blanketRes?.data?.Header?.createdbyName || blanketRes?.data?.Header?.requestorname || "N/A";

            setBlanketPoViewData({
                originalPO: originalRes?.status ? originalRes.data : null,
                originalPono,
                originalCreatedByName,
                blanketPO: blanketRes.data,
                blanketPono,
                blanketCreatedByName,
                blanketGRNs,
            });
        } catch (err) {
            console.error("Error loading Blanket PO view:", err);
            Swal.fire("Error", "Failed to load Blanket PO details.", "error");
            setBlanketPoViewVisible(false);
        } finally {
            setBlanketPoLoading(false);
        }
    };

    const actionBlanketPOBodyTemplate = (rowData) => {
        // If pono ends with -number (e.g. PO0001-1), this row IS the Blanket/Closure PO
        // Users view it by clicking the PO number, so the action column shows nothing here
        const isBlanketPO = rowData.pono && /-\d+$/.test(String(rowData.pono).trim());
        if (isBlanketPO) {
            return "-";
        }

        // Otherwise — standard short closure initiation button
        const isCancelled = rowData.IsCancel === 1 || rowData.IsCancel === true;
        const isClosed = rowData.IsShortClosure === 1 || rowData.isShortClosure === 1;
        const isSubmitted = rowData.IsShortClosureSubmitted === 1 || rowData.isShortClosureSubmitted === 1;

        let btnClass = "btn-info"; // Blue (Default/Not processed)
        let btnStyle = { cursor: "pointer", color: "white" };
        let title = "Blanket PO Short Closure";

        if (isClosed) {
            btnClass = "btn-success"; // Green (Fully approved)
            btnStyle = { cursor: "default", color: "white" };
            title = "PO already short closed";
        } else if (isSubmitted) {
            btnClass = "btn-warning"; // Brownish/Orange (Pending)
            btnStyle = { cursor: "default", color: "white", backgroundColor: "#A52A2A", borderColor: "#A52A2A" };
            title = "Pending acknowledgement";
        } else if (isCancelled) {
            btnClass = "btn-secondary";
            btnStyle = { cursor: "not-allowed", color: "white" };
            title = "PO already cancelled";
        }

        const isDisabled = isCancelled || isClosed || isSubmitted;

        return (
            <button
                className={`btn ${btnClass}`}
                style={btnStyle}
                onClick={() => !isDisabled && handleBlanketPOClick(rowData)}
                disabled={isDisabled}
                title={title}
            >
                <i className="pi pi-file-edit" style={{ color: "white" }}></i>
            </button>
        );
    };

    // const handlePrint = () => {
    //     if (printRef.current) {
    //         const printContents = printRef.current.innerHTML;
    //         const newWin = window.open("", "Print-Window");
    //         newWin.document.open();
    //         newWin.document.write(`
    //             <html>
    //             <head>
    //                 <title>Purchase Order</title>
    //                 <style>
    //                     body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #000; }
    //                     .po-title { text-align: center; font-size: 20px; font-weight: bold; margin: 10px 0; text-decoration: underline; }
    //                     table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
    //                     th, td { border: 1px solid #000; padding: 6px; text-align: left; }
    //                     th { background: #f2f2f2; }
    //                     .signatures-totals { width: 100%; margin-top: 20px; display: flex; justify-content: space-between; }
    //                     .signatures { width: 50%; text-align: center; }
    //                     .totals { width: 45%; }
    //                     .totals div { display: flex; justify-content: space-between; margin: 2px 0; }
    //                     .totals div strong { font-weight: bold; }
    //                 </style>
    //             </head>
    //             <body onload="window.print(); setTimeout(() => window.close(), 100);">
    //                 ${printContents}
    //             </body>
    //             </html>
    //         `);
    //         newWin.document.close();
    //     }
    // };

    const handlePrint = async () => {
        if (!printRef.current) return;

        const scale = 2;
        const canvas = await html2canvas(printRef.current, {
            scale,
            useCORS: true,
            scrollY: -window.scrollY,
        });

        const pdf = new jsPDF("l", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const marginTop = 10;
        const marginBottom = 10;
        const marginLeft = 10;
        const marginRight = 10;

        const usableWidth = pageWidth - marginLeft - marginRight;
        const usableHeight = pageHeight - marginTop - marginBottom;

        const pxPerMM = canvas.width / pageWidth;
        const usableHeightPx = usableHeight * pxPerMM;

        // Get dynamic row height
        let rowHeightPx = 24; // fallback
        const table = printRef.current.querySelector("table");
        if (table) {
            const firstRow = table.querySelector("tr");
            if (firstRow) {
                rowHeightPx = firstRow.getBoundingClientRect().height * scale;
            }
        }

        // Measure height of header (logo + title + info block)
        let headerHeightPx = 0;
        const headerDiv = printRef.current.querySelector("div");
        if (headerDiv) {
            const rect = headerDiv.getBoundingClientRect();
            headerHeightPx = rect.height * scale;
        }

        // Determine first page content height to avoid cutting first row
        const firstPageHeightPx = usableHeightPx - (usableHeightPx % rowHeightPx);

        let position = 0;
        let pageCount = 0;

        while (position < canvas.height) {
            let sliceHeight;

            // On first page, slice from top to fit header + as many full rows as possible
            if (pageCount === 0) {
                const adjustedHeight = usableHeightPx - (headerHeightPx % rowHeightPx);
                sliceHeight = Math.min(adjustedHeight, canvas.height - position);
            } else {
                sliceHeight = Math.min(usableHeightPx - (usableHeightPx % rowHeightPx), canvas.height - position);
            }

            const pageCanvas = document.createElement("canvas");
            pageCanvas.width = canvas.width;
            pageCanvas.height = sliceHeight;

            const ctx = pageCanvas.getContext("2d");
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

            ctx.drawImage(
                canvas,
                0,
                position,
                canvas.width,
                sliceHeight,
                0,
                0,
                canvas.width,
                sliceHeight
            );

            const imgData = pageCanvas.toDataURL("image/png");
            if (pageCount > 0) pdf.addPage();
            const imgWidth = usableWidth;
            const imgHeight = (sliceHeight * imgWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", marginLeft, marginTop, imgWidth, imgHeight);

            position += sliceHeight;
            pageCount++;
        }

        const blobUrl = pdf.output("bloburl");
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.src = blobUrl;
        document.body.appendChild(iframe);

        iframe.onload = () => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        };
    };



    const calculateTotals = (items) => {
        let subtotal = 0,
            discount = 0,
            tax = 0,
            vat = 0,
            total = 0,
            totalamount = 0;

        items.forEach((item) => {
            subtotal += item.subtotal || 0;
            discount += item.discountvalue || 0;
            tax += item.taxvalue || 0;
            vat += item.vatvalue || 0;
            total += item.nettotal || 0;
            totalamount += item.totalamount || 0;
        });

        return { subtotal, discount, tax, vat, total, totalamount };
    };

    const currency =
        poData?.items.length > 0 && poData?.items[0].currencycode
            ? poData?.items[0].currencycode
            : "";


    const handlePonoClick = async (pono) => {
        if (!pono || pono === "NA" || !String(pono).trim()) {
            Swal.fire("Info", "No PO Reference available", "info");
            return;
        }

        const cleanPono = String(pono).trim();

        // Find poid from poOptions (already loaded)
        const poOption = poOptions.find(opt =>
            String(opt.value).trim() === cleanPono
        );

        if (!poOption?.poid) {
            Swal.fire({
                icon: "warning",
                title: "PO Not Found",
                text: `Cannot open PO "${cleanPono}". It may not be loaded yet or doesn't exist.`,
                footer: "Try refreshing the page."
            });
            return;
        }

        try {
            // DO NOT close PR modal → just open PO modal on top
            const res = await GetByIdPurchaseOrder(poOption.poid, orgId, branchId);

            if (res?.status) {
                const supplier_id = res.data?.Header?.supplierid;
                const currency_id = res.data?.Header?.currencyid;
                const prList = await GetPRNoBySupplierAndCurrency(supplier_id, currency_id, orgId, branchId);

                let requisition = res.data.Requisition || [];
                if (prList?.data?.length > 0) {
                    requisition = requisition.map(r => {
                        const pr = prList.data.find(p => p.prid === r.prid);
                        return { ...r, prnumber: pr ? pr.pr_number : "NA" };
                    });
                }

                const headerPRNumbers = [...new Set(requisition.map(r => r.prnumber).filter(Boolean))].join(", ") || "NA";

                setSelectedPODetail({
                    ...res.data,
                    Header: {
                        ...res.data.Header,
                        PRConcat: headerPRNumbers
                    },
                    Requisition: requisition
                });

                setPoDetailVisible(true); // Only open PO modal
            } else {
                Swal.fire("Error", "PO details not available", "error");
            }
        } catch (err) {
            console.error("Failed to load PO:", err);
            Swal.fire("Error", "Could not load Purchase Order", "error");
        }
    };

    // And cancelFilter includes:
    // setSelectedFilterType([]);

    return (
        <>
            <style>
                {`
                    .custom-column-multiselect .p-checkbox {
                        width: 16px;
                        height: 16px;
                    }
                    .custom-column-multiselect .p-checkbox .p-checkbox-box {
                        width: 16px;
                        height: 16px;
                    }
                    .custom-column-multiselect .p-checkbox .p-checkbox-icon {
                        font-size: 10px;
                    }
                    .custom-column-multiselect .p-multiselect-header .p-multiselect-select-all {
                        display: flex;
                        align-items: center;
                        width: auto !important;
                    }
                    .custom-column-multiselect .p-multiselect-header .p-multiselect-select-all::after {
                        content: "Select All";
                        margin-left: 8px;
                        font-size: 13px;
                        color: #495057;
                    }
                    
                    /* Cancelled PO row - red highlight */
                    .p-datatable .p-datatable-tbody > tr.cancelled-row {
                        background-color: #ffcccc !important;
                    }
                    .p-datatable .p-datatable-tbody > tr.cancelled-row > td {
                        background-color: #ffcccc !important;
                        color: #990000 !important;
                    }
                    .p-datatable .p-datatable-tbody > tr.cancelled-row:hover {
                        background-color: #ffaaaa !important;
                    }
                    .p-datatable .p-datatable-tbody > tr.cancelled-row:hover > td {
                        background-color: #ffaaaa !important;
                    }

                `}
            </style>
            <div className="page-content">
                <Container fluid>
                    <Breadcrumbs title="Procurement" breadcrumbItem="Purchase Order" />

                    <Row>
                        <Card className="search-top">
                            {/* Updated Header box for new filters to comfortably span */}
                            <div className="p-3">
                                <Row className="align-items-end g-3 mb-3">
                                    <Col lg={3} md={6} sm={12}>
                                        <Label htmlFor="Search_Type" className="form-label mb-1">Search By</Label>
                                        <Select
                                            name="filtertype"
                                            isMulti
                                            options={FilterTypes.map(f => ({ label: f.name, value: f.value }))}
                                            placeholder="Select Filter Types"
                                            classNamePrefix="select"
                                            isClearable
                                            value={selectedFilterType}
                                            onChange={(selected) => setSelectedFilterType(selected || [])}
                                        />
                                    </Col>

                                    {/* Selectively render inputs based on 'Search By' selection */}
                                    {selectedFilterType?.some(f => f.value === "pono") && (
                                        <Col lg={3} md={6} sm={12}>
                                            <Label className="form-label mb-1">PO No</Label>
                                            <Select
                                                name="filterPoNo"
                                                options={getDropdownOptions('pono')}
                                                placeholder="Search PO No"
                                                classNamePrefix="select"
                                                isClearable
                                                isSearchable
                                                value={filterPoNo}
                                                onChange={(selected) => setFilterPoNo(selected)}
                                            />
                                        </Col>
                                    )}

                                    {selectedFilterType?.some(f => f.value === "suppliername") && (
                                        <Col lg={3} md={6} sm={12}>
                                            <Label className="form-label mb-1">Supplier</Label>
                                            <Select
                                                name="filterSupplier"
                                                options={getDropdownOptions('suppliername')}
                                                placeholder="Search Supplier"
                                                classNamePrefix="select"
                                                isClearable
                                                isSearchable
                                                value={filterSupplier}
                                                onChange={(selected) => setFilterSupplier(selected)}
                                            />
                                        </Col>
                                    )}

                                    {selectedFilterType?.some(f => f.value === "CurrencyCode") && (
                                        <Col lg={3} md={6} sm={12}>
                                            <Label className="form-label mb-1">Currency</Label>
                                            <Select
                                                name="filterCurrency"
                                                options={getDropdownOptions('CurrencyCode')}
                                                placeholder="Search Currency"
                                                classNamePrefix="select"
                                                isClearable
                                                isSearchable
                                                value={filterCurrency}
                                                onChange={(selected) => setFilterCurrency(selected)}
                                            />
                                        </Col>
                                    )}

                                    {selectedFilterType?.some(f => f.value === "podate") && (
                                        <>
                                            <Col lg={3} md={6} sm={12}>
                                                <Label className="form-label mb-1">PO Date From</Label>
                                                <Input
                                                    type="date"
                                                    value={filterPoDateFrom}
                                                    onChange={(e) => setFilterPoDateFrom(e.target.value)}
                                                />
                                            </Col>
                                            <Col lg={3} md={6} sm={12}>
                                                <Label className="form-label mb-1">PO Date To</Label>
                                                <Input
                                                    type="date"
                                                    value={filterPoDateTo}
                                                    onChange={(e) => setFilterPoDateTo(e.target.value)}
                                                    min={filterPoDateFrom}
                                                />
                                            </Col>
                                        </>
                                    )}

                                    {selectedFilterType?.some(f => f.value === "totalamount") && (
                                        <>
                                            <Col lg={3} md={6} sm={12}>
                                                <Label className="form-label mb-1">Total Amount Start</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Min Amount"
                                                    value={filterAmountFrom}
                                                    onChange={(e) => setFilterAmountFrom(e.target.value)}
                                                />
                                            </Col>
                                            <Col lg={3} md={6} sm={12}>
                                                <Label className="form-label mb-1">Total Amount End</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Max Amount"
                                                    value={filterAmountTo}
                                                    onChange={(e) => setFilterAmountTo(e.target.value)}
                                                />
                                            </Col>
                                        </>
                                    )}

                                    {selectedFilterType?.some(f => f.value === "CreatedDate") && (
                                        <>
                                            <Col lg={3} md={6} sm={12}>
                                                <Label className="form-label mb-1">Created Date From</Label>
                                                <Input
                                                    type="date"
                                                    value={filterCreatedDateFrom}
                                                    onChange={(e) => setFilterCreatedDateFrom(e.target.value)}
                                                />
                                            </Col>
                                            <Col lg={3} md={6} sm={12}>
                                                <Label className="form-label mb-1">Created Date To</Label>
                                                <Input
                                                    type="date"
                                                    value={filterCreatedDateTo}
                                                    onChange={(e) => setFilterCreatedDateTo(e.target.value)}
                                                    min={filterCreatedDateFrom}
                                                />
                                            </Col>
                                        </>
                                    )}

                                    {selectedFilterType?.some(f => f.value === "createdbyName") && (
                                        <Col lg={3} md={6} sm={12}>
                                            <Label className="form-label mb-1">Created By</Label>
                                            <Select
                                                name="filterCreatedBy"
                                                options={getDropdownOptions('createdbyName')}
                                                placeholder="Search Creator"
                                                classNamePrefix="select"
                                                isClearable
                                                isSearchable
                                                value={filterCreatedBy}
                                                onChange={(selected) => setFilterCreatedBy(selected)}
                                            />
                                        </Col>
                                    )}

                                    {selectedFilterType?.some(f => f.value === "itemname") && (
                                        <Col lg={3} md={6} sm={12}>
                                            <Label className="form-label mb-1">Item Name</Label>
                                            <Select
                                                name="filterItemName"
                                                options={allItemsForFilter}
                                                placeholder="Search Item Name"
                                                classNamePrefix="select"
                                                isClearable
                                                isSearchable
                                                value={filterItemName}
                                                onChange={(selected) => setFilterItemName(selected)}
                                            />
                                        </Col>
                                    )}
                                </Row>
                                <Row className="align-items-end g-3">
                                    <Col lg={3} md={6} sm={12}>
                                        <Label htmlFor="Column_Toggle" className="form-label mb-1">Column</Label>
                                        <MultiSelect
                                            value={visibleColumns}
                                            options={columns}
                                            optionLabel="header"
                                            onChange={(e) => setVisibleColumns(e.value)}
                                            className="w-100"
                                            panelClassName="custom-column-multiselect"
                                            maxSelectedLabels={0}
                                            selectedItemsLabel="{0} items selected"
                                            style={{ height: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', fontSize: '13px', padding: '0px 2px', lineHeight: '1' }}
                                        />
                                    </Col>

                                    <Col lg={9} md={6} sm={12} className="d-flex justify-content-end flex-wrap gap-2">
                                        <button type="button" className="btn btn-warning w-xs" onClick={fetchAdvancedData} disabled={isAdvancedLoading} style={{ width: "auto" }}>
                                            {isAdvancedLoading ? <i className="bx bx-loader bx-spin font-size-16 align-middle me-2"></i> : <i className="bx bx-list-ul label-icon font-size-16 align-middle me-2"></i>} ADVANCED SEARCH
                                        </button>
                                        <button type="button" className="btn btn-info w-xs" onClick={searchData}>
                                            <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i> Search
                                        </button>
                                        <button type="button" className="btn btn-danger w-xs" onClick={cancelFilter}>
                                            <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>Cancel
                                        </button>
                                        {!isRestrictedUser && (
                                            <button type="button" className="btn btn-success w-xs" onClick={linkAddPurchaseOrder}>
                                                <i className="bx bx-plus label-icon font-size-16 align-middle me-2"></i>New
                                            </button>
                                        )}
                                    </Col>
                                </Row>
                            </div>
                        </Card>
                    </Row>

                    <Row>
                        <Col lg="12">
                            {isAdvancedSearch ? (
                                <Card>
                                    <div className="p-4" style={{ overflowX: "auto" }}>
                                        <table className="table table-bordered table-sm m-0" style={{ fontSize: "12px", borderColor: "#dee2e6", minWidth: "1200px", verticalAlign: "middle" }}>
                                            <thead style={{ backgroundColor: "#0069aa", color: "white" }}>
                                                <tr>
                                                    <th className="fw-bold align-middle" style={{ backgroundColor: "#0069aa", color: "white" }}>No.</th>
                                                    <th className="fw-bold" style={{ backgroundColor: "#0069aa", color: "white" }}>PO Date<br /><span className="fw-normal" style={{ color: "#d9e9fa" }}>Required Date</span></th>
                                                    <th className="fw-bold align-middle" style={{ backgroundColor: "#0069aa", color: "white" }}>PO No</th>
                                                    <th className="fw-bold" style={{ backgroundColor: "#0069aa", color: "white", width: "25%" }}>Supplier<br /><span className="fw-normal" style={{ color: "#d9e9fa" }}>Part Description</span></th>
                                                    <th className="fw-bold" style={{ backgroundColor: "#0069aa", color: "white", minWidth: "100px" }}>Payment Term<br /><span className="fw-normal" style={{ color: "#d9e9fa" }}>Unit</span></th>
                                                    <th className="fw-bold text-center align-middle" style={{ backgroundColor: "#0069aa", color: "white" }}>Qty</th>
                                                    <th className="fw-bold text-center align-middle" style={{ backgroundColor: "#0069aa", color: "white" }}>Ordered</th>
                                                    <th className="fw-bold text-center align-middle" style={{ backgroundColor: "#0069aa", color: "white" }}>Received</th>
                                                    <th className="fw-bold text-end align-middle" style={{ backgroundColor: "#0069aa", color: "white" }}>Unit Price</th>
                                                    <th className="fw-bold text-end" style={{ backgroundColor: "#0069aa", color: "white", minWidth: "100px" }}>Sub Total<br /><span className="fw-normal" style={{ color: "#d9e9fa" }}>Amount</span></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {advancedData.map((poData, idx) => {
                                                    const isExpanded = advancedExpandedRows[idx];
                                                    return (
                                                        <React.Fragment key={idx}>
                                                            {/* Main PO Row */}
                                                            <tr>
                                                                <td className="align-middle">
                                                                    {idx + 1}.
                                                                    <i
                                                                        className={`bx ${isExpanded ? 'bx-minus' : 'bx-plus'} ms-2 text-primary`}
                                                                        style={{ cursor: 'pointer', border: '1px solid #556ee6', borderRadius: '2px', padding: '1px' }}
                                                                        onClick={() => setAdvancedExpandedRows(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                                                        title={isExpanded ? "Collapse" : "Expand"}
                                                                    ></i>
                                                                </td>
                                                                <td className="align-middle">{formatDate(poData.header.podate)}</td>
                                                                <td className="align-middle">{poData.header.pono}</td>
                                                                <td className="align-middle fw-bold">{poData.header.suppliername}</td>
                                                                <td className="align-middle">{(poData.header.PaymentTerm || poData.header.paymentterm || "90 Days").split('-').pop().trim()}</td>
                                                                <td></td>
                                                                <td></td>
                                                                <td></td>
                                                                <td></td>
                                                                <td className="text-end fw-bold align-middle">{poData.header.totalamount?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                            </tr>

                                                            {/* Details Rows */}
                                                            {isExpanded && poData.details.map((item, idetail) => {
                                                                const itemTotal = item.nettotal || item.totalvalue || (item.qty * item.unitprice) || 0;
                                                                return (
                                                                    <tr key={idetail}>
                                                                        <td></td>
                                                                        <td className="align-middle">{formatDate(poData.header.podate)}</td>
                                                                        <td></td>
                                                                        <td className="align-middle">{item.itemdescription || item.itemname}</td>
                                                                        <td className="align-middle">{item.UOM || item.uom || item.UOMName || "CYL"}</td>
                                                                        <td className="align-middle text-center">{item.qty}</td>
                                                                        <td className="align-middle text-center">{item.qty}</td>
                                                                        <td className="align-middle text-center">{item.qty}</td>
                                                                        <td className="align-middle text-end">{item.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                                        <td className="align-middle text-end">{itemTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                                    </tr>
                                                                )
                                                            })}
                                                        </React.Fragment>
                                                    )
                                                })}
                                                {/* Grand Total Row */}
                                                <tr className="bg-light">
                                                    <td colSpan={8}></td>
                                                    <td className="text-end fw-bold">Grand Total</td>
                                                    <td className="text-end fw-bold">
                                                        {advancedData.reduce((sum, po) => sum + (po.header.totalamount || 0), 0)?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            ) : (
                                <Card>
                                    <DataTable
                                        value={purchaseOrders}
                                        paginator
                                        showGridlines
                                        rows={20}
                                        loading={isLoading}
                                        dataKey="poid"
                                        filters={filters}
                                        globalFilterFields={['pono', 'podate', 'requestorname', 'suppliername', 'CreatedDate', 'createdbyName', 'CurrencyCode', 'totalamount', 'Status', 'irn_no', 'grn_no', 'claim_no']}
                                        emptyMessage="No suppliers found."
                                        header={header}
                                        onFilter={(e) => setFilters(e.filters)}
                                        className="blue-bg"
                                        rowClassName={(data) => ({ 'cancelled-row': data.IsCancel === 1 || data.IsCancel === true })}
                                    >
                                        {visibleColumns.find(col => col.field === 'pono') && <Column
                                            field="pono"
                                            header="PO No"
                                            filter
                                            filterPlaceholder="Search by PO NO"
                                            className="text-left"
                                            style={{ width: "10%" }}
                                            body={actionclaimBodyTemplate}
                                        />}
                                        {visibleColumns.find(col => col.field === 'podate') && <Column
                                            field="podate"
                                            header="PO Date"
                                            filter
                                            filterPlaceholder="Search by PO Date"
                                            className="text-center"
                                            style={{ width: "10%" }}
                                        />}
                                        {/* <Column
                                        field="requestorname"
                                        header="Requestor"
                                        filter
                                        filterPlaceholder="Search by Requestor"
                                        className="text-left"
                                    /> */}
                                        {visibleColumns.find(col => col.field === 'suppliername') && <Column
                                            field="suppliername"
                                            header="Supplier"
                                            filter
                                            filterPlaceholder="Search by Supplier"
                                            className="text-left"
                                        />}
                                        {visibleColumns.find(col => col.field === 'CurrencyCode') && <Column
                                            field="CurrencyCode"
                                            header="Currency"
                                            filter
                                            filterPlaceholder="Search by Currency"
                                            className="text-left"
                                        />}

                                        {visibleColumns.find(col => col.field === 'totalamount') && <Column style={{ textAlign: "right" }} field="totalamount" header="Total Amount"
                                            body={(rowData) =>
                                                rowData.totalamount?.toLocaleString('en-US', {
                                                    style: 'decimal',
                                                    minimumFractionDigits: 2
                                                })
                                            } />}

                                        {visibleColumns.find(col => col.field === 'CreatedDate') && <Column
                                            field="CreatedDate"
                                            header="Created Date"
                                            filter
                                            filterPlaceholder="Search by created date"
                                            className="text-left"
                                        />}
                                        {visibleColumns.find(col => col.field === 'createdbyName') && <Column
                                            field="createdbyName"
                                            header="Created By"
                                            filter
                                            filterPlaceholder="Search by created by"
                                            className="text-left"
                                        />}

                                        {/* <Column
                                        field="totalamount"
                                        header="Total Amount"

                                        // filter
                                        className="text-lg-end"
                                        // filterPlaceholder="Search by TotalAmt"
                                        style={{ width: "15%" }}
                                    /> */}
                                        <Column
                                            field="Status"
                                            header="Status"
                                            filterMenuStyle={{ width: '14rem' }}
                                            body={statusBodyTemplate}
                                            // filter
                                            // filterElement={statusFilterTemplate}
                                            className="text-center"
                                            style={{ width: "10%" }}
                                        />
                                        <Column
                                            field="grn_no"
                                            header="GRN No"
                                            filter
                                            filterPlaceholder="Search by GRN"
                                            className="text-left"
                                            style={{ width: "10%" }}
                                            body={grnLinkBodyTemplate}
                                        />
                                        <Column
                                            field="irn_no"
                                            header="IRN No"
                                            filter
                                            filterPlaceholder="Search by IRN"
                                            className="text-left"
                                            style={{ width: "10%" }}
                                            body={irnLinkBodyTemplate}
                                        />
                                        <Column
                                            field="claim_no"
                                            header="Claim No"
                                            filter
                                            filterPlaceholder="Search by Claim"
                                            className="text-left"
                                            style={{ width: "10%" }}
                                            body={claimLinkBodyTemplate}
                                        />
                                        {visibleColumns.find(col => col.field === 'po_gm') && <Column
                                            field="po_gm"
                                            header="GM"
                                            body={(rowData) => approvalStatusTemplate(rowData, 'po_gm')}
                                            className="text-center"
                                            style={{ width: "5%" }}
                                        />}
                                        {visibleColumns.find(col => col.field === 'po_director') && <Column
                                            field="po_director"
                                            header="Director"
                                            body={(rowData) => approvalStatusTemplate(rowData, 'po_director')}
                                            className="text-center"
                                            style={{ width: "5%" }}
                                        />}
                                        {/* <Column
                                        header="Action"
                                        showFilterMatchModes={false}
                                        body={actionBodyTemplate}
                                        className="text-center"
                                        style={{ width: "8%" }}
                                    /> */}
                                        <Column field="id" header="Print" showFilterMatchModes={false}
                                            // body={(rowData) => <SQPrintColumn sqid={rowData.id} />}
                                            body={actionPOPrintBodyTemplate}
                                            // body={(rowData) => <POPrintColumn poid={rowData.poid} />}
                                            className="text-center"
                                            style={{ width: "5%" }}
                                        />
                                        {UserData?.u_id === 135 && UserData?.username?.toLowerCase() === "hugo" && (
                                            <Column
                                                header="Blanket PO"
                                                body={actionBlanketPOBodyTemplate}
                                                className="text-center"
                                                style={{ width: "5%" }}
                                            />
                                        )}
                                        {/* Delete column - only visible to user 135 */}
                                        {UserData?.u_id === 135 && (
                                            <Column
                                                field="delete"
                                                header="Delete"
                                                showFilterMatchModes={false}
                                                body={actionDeleteBodyTemplate}
                                                className="text-center"
                                                style={{ width: "5%" }}
                                            />
                                        )}
                                    </DataTable>
                                </Card>
                            )}
                        </Col>
                    </Row>

                </Container>
            </div>

            {/* Confirmation Modal */}
            <Modal isOpen={isModalOpen2} toggle={() => setIsModalOpen2(false)} centered tabIndex="1">
                <ModalBody className="py-3 px-5">
                    <Row>
                        <Col lg={12}>
                            <div className="text-center">
                                <i className="mdi mdi-alert-circle-outline" style={{ fontSize: "9em", color: "orange" }} />
                                <h4>Do you want to {txtStatus} this item?</h4>
                            </div>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <div className="text-center mt-3 button-items">
                                <Button className="btn btn-info" color="success" size="lg" onClick={onSwitchChange}>
                                    Yes
                                </Button>
                                <Button color="danger" size="lg" className="btn btn-danger" onClick={() => setIsModalOpen2(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </ModalBody>
            </Modal>

            {/* New Pallet Modal */}
            <Modal isOpen={isModalOpen} role="dialog" autoFocus centered className="exampleModal" tabIndex="-1" toggle={toggleModal} size="xl">
                <div className="modal-content">
                    <ModalHeader toggle={toggleModal} className="bg-model-hd">New Pallet</ModalHeader>
                    <ModalBody>
                        <Row>
                            <Col lg="12">
                                <Card>
                                    <CardBody>
                                        <Formik
                                            initialValues={{ gasCode: "", containerType: "", palletname: "" }}
                                            validationSchema={validationSchema}
                                            onSubmit={handleSubmit}
                                        >
                                            {({ errors, touched, setFieldValue, setFieldTouched, values }) => (
                                                <Form>
                                                    <Row>
                                                        <Col md="4">
                                                            <FormGroup>
                                                                <Label htmlFor="palletname" className="required-label">Pallet Name</Label>
                                                                <Field
                                                                    name="palletname"
                                                                    className={`form-control ${errors.palletname && touched.palletname ? "is-invalid" : ""}`}
                                                                />
                                                                <ErrorMessage name="palletname" component="div" className="text-danger" />
                                                            </FormGroup>
                                                        </Col>

                                                        <Col md="4">
                                                            <FormGroup>
                                                                <Label htmlFor="containerType" className="required-label">Container Type</Label>
                                                                <Select
                                                                    name="containerType"
                                                                    options={ContainerList}
                                                                    value={ContainerList.find(option => option.value === values.containerType)}
                                                                    onChange={option => {
                                                                        setFieldValue("containerType", option ? option.value : "");
                                                                        setFieldTouched("containerType", true);
                                                                        handleContainerTypeChange(option);
                                                                    }}
                                                                    onBlur={() => setFieldTouched("containerType", true)}
                                                                    className={errors.containerType && touched.containerType ? "select-invalid" : ""}
                                                                    classNamePrefix="select"
                                                                    isDisabled={isDisabled}
                                                                    isLoading={isLoading}
                                                                    isClearable={isClearable}
                                                                    isRtl={isRtl}
                                                                    isSearchable={isSearchable}
                                                                />
                                                                <ErrorMessage name="containerType" component="div" className="text-danger" />
                                                            </FormGroup>
                                                        </Col>

                                                        <Col md="4">
                                                            <FormGroup>
                                                                <Label htmlFor="gasCode" className="required-label">Gas Code</Label>
                                                                <Select
                                                                    name="gasCode"
                                                                    options={GasCodeList}
                                                                    value={GasCodeList.find(option => option.value === values.gasCode)}
                                                                    onChange={option => {
                                                                        setFieldValue("gasCode", option ? option.value : "");
                                                                        setFieldTouched("gasCode", true);
                                                                    }}
                                                                    onBlur={() => setFieldTouched("gasCode", true)}
                                                                    className={errors.gasCode && touched.gasCode ? "select-invalid" : ""}
                                                                    classNamePrefix="select"
                                                                    isDisabled={isDisabled}
                                                                    isLoading={isLoading}
                                                                    isClearable={isClearable}
                                                                    isRtl={isRtl}
                                                                    isSearchable={isSearchable}
                                                                />
                                                                <ErrorMessage name="gasCode" component="div" className="text-danger" />
                                                            </FormGroup>
                                                        </Col>

                                                        <Col md="12">
                                                            <Table className="table-nowrap mb-0">
                                                                <thead style={{ backgroundColor: "#3e90e2" }}>
                                                                    <tr>
                                                                        <th>S.No</th>
                                                                        <th>Cylinder Name</th>
                                                                        <th>Ownership</th>
                                                                        <th>Bar code</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {cylinderTableData.length > 0 ? (
                                                                        cylinderTableData.map((row, index) => (
                                                                            <tr key={index}>
                                                                                <td>{row.id}</td>
                                                                                <td>
                                                                                    <Field name={`cylinders[${index}].category`} as="select" className="form-control">
                                                                                        <option>Paid</option>
                                                                                        <option>Chargeback</option>
                                                                                        <option>Refund</option>
                                                                                    </Field>
                                                                                </td>
                                                                                <td>
                                                                                    <input
                                                                                        type="text"
                                                                                        className="form-control"
                                                                                        value={row.ownership}
                                                                                        readOnly
                                                                                    />
                                                                                </td>
                                                                                <td>
                                                                                    <input
                                                                                        type="text"
                                                                                        className="form-control"
                                                                                        value={row.barCode}
                                                                                        readOnly
                                                                                    />
                                                                                </td>
                                                                            </tr>
                                                                        ))
                                                                    ) : (
                                                                        <tr>
                                                                            <td colSpan="4" className="text-center">No data available</td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </Table>
                                                        </Col>
                                                    </Row>

                                                    <div className="row align-items-center g-3 justify-content-end">
                                                        <div className="col-md-12 text-end button-items">
                                                            <Button type="submit" className="btn btn-info">
                                                                <i className="bx bxs-save label-icon font-size-16 align-middle me-2"></i> Save
                                                            </Button>
                                                            <Button type="button" className="btn btn-danger" onClick={toggleModal}>
                                                                <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i> Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Form>
                                            )}
                                        </Formik>
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    </ModalBody>
                </div>
            </Modal>

            <Modal isOpen={detailVisible} toggle={() => setDetailVisible(false)} size="xl">
                <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '15px', right: '50px', fontWeight: 'bold', color: '#333', fontSize: '12px', zIndex: 10 }}>F-BTG-PUR-06 (Rev.01)</span>
                    <ModalHeader toggle={() => setDetailVisible(false)}>Purchase Order Details</ModalHeader>
                </div>
                <ModalBody>
                    {selectedDetail && (
                        <>
                            {/* PO Header Section */}
                            <Row form>
                                {[
                                    ["PO No.", selectedDetail.Header?.pono],
                                    ["PO Date", formatDate(selectedDetail.Header?.podate)],
                                    ["Supplier", selectedDetail.Header?.suppliername],
                                    ["Currency", selectedDetail.Header?.currencycode],
                                    ["PR No.", selectedDetail.Header?.PRConcat], // concat of all PRs
                                ].map(([label, val], i) => (
                                    // <Col md="4" key={i} className="form-group row ">
                                    //     <Label className="col-sm-5 col-form-label bold">{label}</Label>
                                    //     <Col sm="7" className="mt-2">: {val}</Col>
                                    // </Col>
                                    <Col md="4" key={i} className="form-group row">
                                        <Label className="col-sm-5 col-form-label bold">{label}</Label>
                                        <Col sm="7" className="mt-2">
                                            :{" "}
                                            {label === "Supplier" ? (
                                                <b>{val || "N/A"}</b>
                                            ) : label === "Currency" ? (
                                                <span style={{ color: "green", fontWeight: "bold" }}>{val || "N/A"}</span>
                                            ) : label === "PR No." ? (
                                                (() => {
                                                    // Safely get the values
                                                    const prConcat = selectedDetail.Header?.PRConcat || "";

                                                    // Build a mapping of PR number -> PR ID from Requisition data
                                                    const prIdMap = {};
                                                    if (selectedDetail.Requisition && Array.isArray(selectedDetail.Requisition)) {
                                                        selectedDetail.Requisition.forEach(req => {
                                                            if (req.prnumber && req.prid) {
                                                                prIdMap[req.prnumber.trim()] = req.prid;
                                                            }
                                                        });
                                                    }
                                                    console.log("DEBUG: PR ID Map:", prIdMap);

                                                    if (!prConcat || prConcat === "NA" || prConcat.trim() === "") {
                                                        return "N/A";
                                                    }

                                                    const prNumbers = prConcat.split(","); // Safe now

                                                    return (
                                                        <span>
                                                            {prNumbers.map((prNumber, index) => {
                                                                const cleanPR = prNumber.trim();
                                                                if (!cleanPR) return null;

                                                                // Look up the PR ID from our mapping
                                                                const prid = prIdMap[cleanPR];
                                                                const isLast = index === prNumbers.length - 1;

                                                                return (
                                                                    <span key={index}>
                                                                        {prid ? (
                                                                            <a
                                                                                href="#"
                                                                                style={{
                                                                                    color: "#007bff",
                                                                                    textDecoration: "underline",
                                                                                    cursor: "pointer",
                                                                                }}
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    console.log("DEBUG: Clicking PR:", cleanPR, "with ID:", prid);
                                                                                    handlePRClick(prid); // Opens correct PR
                                                                                }}
                                                                                title={`View ${cleanPR}`}
                                                                            >
                                                                                {cleanPR}
                                                                            </a>
                                                                        ) : (
                                                                            <span style={{ color: "#666" }}>{cleanPR}</span>
                                                                        )}
                                                                        {!isLast && ", "}
                                                                    </span>
                                                                );
                                                            })}
                                                        </span>
                                                    );
                                                })()
                                            ) : (
                                                val || "N/A"
                                            )}
                                        </Col>
                                    </Col>
                                ))}
                            </Row>

                            <hr />

                            <DataTable value={selectedDetail.Requisition}>
                                <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                                <Column field="prnumber" header="PR No." />
                                <Column field="groupname" header="Item Group" />
                                <Column field="itemname" header="Item Name" />


                                <Column
                                    field="qty"
                                    header="Qty"
                                    body={(rowData) =>
                                        rowData.qty?.toLocaleString("en-US", { minimumFractionDigits: 3 })
                                    }
                                // footer={selectedDetail.Header?.subtotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />
                                <Column field="uom" header="UOM" />
                                <Column
                                    field="unitprice"
                                    header="Unit Price"
                                    body={(rowData) =>
                                        rowData.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={selectedDetail.Header?.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />

                                <Column
                                    field="discountvalue"
                                    header="Discount"
                                    body={(rowData) =>
                                        rowData.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={selectedDetail.Header?.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />

                                <Column field="taxperc" header="Tax %" />

                                <Column
                                    field="taxvalue"
                                    header="Tax Amt"
                                    body={(rowData) =>
                                        rowData.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={selectedDetail.Header?.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />

                                <Column field="vatperc" header="VAT %" />

                                <Column
                                    field="vatvalue"
                                    header="VAT Amt"
                                    body={(rowData) =>
                                        rowData.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={selectedDetail.Header?.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />

                                <Column
                                    field="nettotal"
                                    header="Total Amt"
                                    body={(rowData) =>
                                        <span style={{ color: "#ff5a00" }}>{rowData.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                    }
                                    bodyStyle={{ color: "#ff5a00" }}
                                    footer={<b style={{ color: "#ff5a00" }}>{selectedDetail.Header?.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</b>}
                                    footerStyle={{ color: "#ff5a00" }}
                                />
                            </DataTable>

                        </>
                    )}
                </ModalBody>

                <ModalFooter>
                    <button type="button" className="btn btn-danger" onClick={() => setDetailVisible(false)}>
                        <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Close
                    </button>
                </ModalFooter>
            </Modal>

            <Modal
                isOpen={poModalVisible}
                toggle={() => setPoModalVisible(false)}
                size="xl"
            >
                <ModalHeader toggle={() => setPoModalVisible(false)}>
                    Purchase Order Print Preview
                </ModalHeader>
                <ModalBody>
                    {poData ? (
                        <div
                            ref={printRef}
                            style={{
                                padding: 20,
                                fontFamily: "Arial, sans-serif",
                                color: "#000",
                            }}
                        >
                            {/* Header Top: Logo + Company */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={{ display: "flex", alignItems: "flex-start" }}>
                                    <img
                                        src="/logo.png"
                                        alt="Logo"
                                        style={{ height: 60, marginRight: 15 }}
                                    />
                                    <div>
                                        <p style={{ fontWeight: "bold", marginBottom: 2 }}>
                                            {poData?.header[0].CompanyName}
                                        </p>
                                        <p style={{ marginBottom: 1 }}>
                                            {poData?.header[0].Address1}, {poData?.header[0].Address2},{" "}
                                            {poData?.header[0].Address3}
                                        </p>
                                        <p style={{ marginBottom: 1 }}>
                                            {poData?.header[0].WebSite}  {poData?.header[0].Email}
                                        </p>
                                        <p style={{ marginBottom: 1 }}>
                                            {poData?.header[0].TelePhone}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ fontWeight: "bold", color: "#333", fontSize: "12px", marginTop: "10px" }}>
                                    F-BTG-PUR-06 (Rev.01)
                                </div>
                            </div>

                            {/* Title */}
                            <div
                                style={{
                                    textAlign: "center",
                                    fontSize: 20,
                                    fontWeight: "bold",
                                    marginTop: 10,
                                    marginBottom: 10,
                                }}
                            >
                                {poData?.header[0].header || "PURCHASE ORDER"}
                            </div>

                            {/* Supplier Info + PO Info */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: 10,
                                }}
                            >
                                {/* Supplier Info */}
                                <div style={{ width: "60%" }}>
                                    <div style={{ display: "flex", alignItems: "flex-start" }}>
                                        {/* To : Label */}
                                        <span style={{ width: "20px" }}>To</span>
                                        <span style={{ width: "20px", textAlign: "center" }}>:</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: "bold" }}>{poData?.supplier.suppliername}</div>
                                            <div>{poData?.supplier.Address}</div>
                                            <div>Tel&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {poData?.supplier.PhoneNo}</div>
                                            <div>Email&nbsp;&nbsp;&nbsp;: {poData?.supplier.Email}</div>
                                        </div>
                                    </div>
                                </div>


                                {/* PO Info */}
                                <div style={{ width: "40%" }}>
                                    {[
                                        { label: "Request No.", value: poData?.header[0].PR_Numbers },
                                        { label: "P.O. No.", value: poData?.header[0].pono },
                                        { label: "Date", value: poData?.header[0].podate },
                                        { label: "Payment Term", value: poData?.header[0].PaymentTerm || poData?.supplier?.PaymentTerm || "-" },
                                    ].map((item, idx) => (
                                        <div
                                            key={idx}
                                            style={{ display: "flex", alignItems: "center", marginBottom: "2px" }}
                                        >
                                            <span style={{ width: "100px", whiteSpace: "nowrap" }}>{item.label}</span>
                                            <span style={{ width: "20px", textAlign: "center" }}>:</span>
                                            <span style={{ flex: 1 }}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>

                            </div>

                            {/* Items Table */}
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontSize: 13,
                                    marginBottom: 10,
                                    border: '1px solid #e4e4e4'
                                }}
                            >
                                <thead>
                                    <tr>
                                        <th  >No.</th>
                                        <th >Description</th>
                                        <th >Quantity</th>
                                        <th >Unit Price</th>
                                        <th >Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {poData?.items.map((item, idx) => {
                                        const formatDecimal = (val) =>
                                            val !== undefined && val !== null && !isNaN(val)
                                                ? Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 })
                                                : "";

                                        return (
                                            <tr key={idx}>
                                                <td style={{ textAlign: "center" }}>{idx + 1}</td>
                                                <td style={{ wordBreak: 'break-all' }}>{item.itemdescription}</td>
                                                <td style={{ textAlign: "center" }}>
                                                    {parseFloat(item.qty || 0).toLocaleString("en-US")} {item.UOM}
                                                </td>
                                                <td style={{ textAlign: "right" }}>
                                                    {formatDecimal(item.unitprice)}
                                                </td>
                                                <td style={{ textAlign: "right" }}>
                                                    {formatDecimal(item.totalvalue)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {Array.from({ length: Math.max(0, 6 - poData?.items.length) }).map((_, idx) => (
                                        <tr key={`empty-${idx}`}>
                                            <td style={{ border: "0px" }} colSpan={5}>&nbsp;</td>

                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Note */}
                            <p style={{ fontSize: 11, marginTop: 5 }}>
                                <strong>Note :</strong> All activities carried out in the
                                production area of PT. BTG must comply with occupational safety and
                                health regulations. During loading and unloading materials, the
                                supplier’s operator shall wear PPE. If any accident and injury
                                caused by negligence on the part of supplier, will not be the
                                responsibility of PT. BTG.
                            </p>

                            {/* Signatures + Totals */}
                            <table style={{ width: "100%", marginTop: "20px" }}>
                                <tbody>
                                    <tr className="no-border">
                                        {/* Left side signatures */}
                                        <td
                                            style={{
                                                width: "40%",
                                                verticalAlign: "top",
                                                padding: "10px",
                                                border: "none",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    width: "80%",
                                                }}
                                            >
                                                <div>
                                                    <div>Best Regards,</div>
                                                    <div
                                                        style={{ marginTop: "40px", fontWeight: "bold" }}
                                                    >
                                                        {poData?.header[0].Regards}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div>Approval Authority,</div>
                                                    <div
                                                        style={{ marginTop: "40px", fontWeight: "bold" }}
                                                    >
                                                        {poData?.header[0].ApprovalAuthority}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Right side totals */}
                                        <td
                                            style={{
                                                width: "40%",
                                                verticalAlign: "top",
                                                padding: "10px",
                                                border: "none",
                                            }}
                                        >
                                            {(() => {
                                                const { subtotal, discount, tax, vat, total, totalamount } = calculateTotals(poData?.items);

                                                const formatDecimal = (val) =>
                                                    val !== undefined && val !== null && !isNaN(val)
                                                        ? Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                        : "";

                                                return (
                                                    <div style={{ width: "100%", marginLeft: "auto" }}>
                                                        <div style={{ display: "flex", width: "100%" }}>
                                                            <div style={{ width: "40%", textAlign: "right" }}>Subtotal</div>
                                                            <div style={{ width: "10%", textAlign: "center" }}>{currency || ""}</div>
                                                            <div style={{ width: "50%", textAlign: "right" }}>
                                                                {formatDecimal(totalamount)}
                                                            </div>
                                                        </div>

                                                        <div style={{ display: "flex", width: "100%" }}>
                                                            <div style={{ width: "40%", textAlign: "right" }}>Discount</div>
                                                            <div style={{ width: "10%", textAlign: "center" }}>{currency || ""}</div>
                                                            <div style={{ width: "50%", textAlign: "right" }}>
                                                                {formatDecimal(discount)}
                                                            </div>
                                                        </div>

                                                        <div style={{ display: "flex", width: "100%" }}>
                                                            <div style={{ width: "40%", textAlign: "right" }}>Tax</div>
                                                            <div style={{ width: "10%", textAlign: "center" }}>{currency || ""}</div>
                                                            <div style={{ width: "50%", textAlign: "right" }}>
                                                                {formatDecimal(tax)}
                                                            </div>
                                                        </div>

                                                        <div style={{ display: "flex", width: "100%" }}>
                                                            <div style={{ width: "40%", textAlign: "right" }}>VAT</div>
                                                            <div style={{ width: "10%", textAlign: "center" }}>{currency || ""}</div>
                                                            <div style={{ width: "50%", textAlign: "right" }}>
                                                                {formatDecimal(vat)}
                                                            </div>
                                                        </div>

                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                width: "100%",
                                                                fontWeight: "bold",
                                                                marginTop: "5px",
                                                            }}
                                                        >
                                                            <div style={{ width: "40%", textAlign: "right" }}>TOTAL NETTO</div>
                                                            <div style={{ width: "10%", textAlign: "center" }}>{currency || ""}</div>
                                                            <div style={{ width: "50%", textAlign: "right" }}>
                                                                {formatDecimal(total)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Footer */}

                            <div
                                style={{
                                    marginTop: 30,
                                    fontSize: 11,
                                    display: "flex",
                                    justifyContent: "space-between",
                                }}
                            >
                                <span>
                                    {(() => {
                                        const rawDate = poData?.header[0].printdatetime || new Date();
                                        const user = poData?.header[0].printuser || "HUGO";

                                        // Convert to Date object if string
                                        const dateObj = new Date(rawDate);

                                        // Format like 22-Jul-2025 14:05:50
                                        const options = { day: "2-digit", month: "short", year: "numeric" };
                                        const datePart = dateObj.toLocaleDateString("en-GB", options).replace(/ /g, "-");
                                        const timePart = dateObj.toLocaleTimeString("en-GB", { hour12: false });

                                        return `Printed On ${datePart} ${timePart}, by ${user}`;
                                    })()}
                                </span>
                                <span>Page 1 of 1</span>
                            </div>

                            <div
                                style={{
                                    marginTop: 30,
                                    fontSize: 11,
                                    display: "flex",
                                    justifyContent: "space-between",
                                }}
                            >
                                <span style={{ fontWeight: "bold", fontSize: "15px" }}>
                                    As this is an autogenerated print from the computer, no signature need</span>
                            </div>
                        </div>

                    ) : (
                        <div>Loading...</div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <button className="btn btn-danger" onClick={() => setPoModalVisible(false)}>
                        Close
                    </button>
                    <button className="btn btn-primary" onClick={handlePrint}>
                        Print
                    </button>
                </ModalFooter>
            </Modal>

            {/* PR Details Modal - Reusable */}
            <Modal isOpen={prDetailVisible} toggle={() => setPrDetailVisible(false)} size="xl">
                <ModalHeader toggle={() => setPrDetailVisible(false)}>PR Details</ModalHeader>
                <ModalBody>
                    {selectedPRDetail && (
                        <>
                            {/* Header Section */}
                            <Row form>
                                {[
                                    ["PR No.", selectedPRDetail.Header?.PR_Number],
                                    ["PR Type", selectedPRDetail.Header?.prTypeName],
                                    ["PR Date", formatDate(selectedPRDetail.Header?.PRDate || selectedPRDetail.Header?.prdate)],
                                    ["PM No.", selectedPRDetail.Header?.MemoConcat],
                                    ["Supplier", selectedPRDetail.Header?.SupplierName],
                                    ["Currency", selectedPRDetail.Header?.currencycode],
                                    ["Payment Term", selectedPRDetail.Header?.PaymentTermName],
                                    ["Sup. Address", selectedPRDetail.Header?.SupplierAddress],
                                    ["Delivery Term", selectedPRDetail.Header?.DeliveryTerm],
                                    ["Requestor", selectedPRDetail.Header?.UserName],
                                    ["BTG Delivery Address", selectedPRDetail.Header?.BTGDeliveryAddress],
                                    ["Sup. Contact", selectedPRDetail.Header?.contact],
                                    ["Sup. Email", selectedPRDetail.Header?.Email],
                                    ["Projects", selectedPRDetail.Header?.ProjectName],
                                    ["PO Reference", selectedPRDetail.Header?.poreference],
                                ].map(([label, val], i) => (
                                    // <Col md="4" key={i} className="form-group row ">
                                    //     <Label className="col-sm-5 col-form-label bold">{label}</Label>
                                    //     <Col sm="7" className="mt-2">: {val || "N/A"}</Col>
                                    // </Col>
                                    <Col md="4" key={i} className="form-group row">
                                        <Label className="col-sm-5 col-form-label bold">{label}</Label>

                                        <Col sm="7" className="mt-2" style={{ wordWrap: "break-word" }}>
                                            :{" "}

                                            {/* Make PONO clickable */}
                                            {label === "PO Reference" ? (
                                                <a
                                                    onClick={() => handlePonoClick(val)}
                                                    style={{ color: "#007bff", textDecoration: "underline", cursor: "pointer" }}
                                                >
                                                    {val || "N/A"}
                                                </a>
                                            ) : (label === "Supplier") ? (
                                                <b>{val}</b>
                                            ) : (label === "Currency") ? (
                                                <b style={{ color: "green" }}>{val}</b>
                                            )

                                                : (
                                                    val
                                                )}
                                        </Col>
                                    </Col>
                                ))}
                            </Row>

                            <hr />

                            <DataTable value={selectedPRDetail.Details} footerColumnGroup={
                                <ColumnGroup>
                                    <Row>
                                        <Column footer="GRAND TOTAL" colSpan={6} footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                                        <Column footer={<b>{selectedPRDetail.Header?.HeaderDiscountValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} />
                                        <Column footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                                        <Column footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                                        <Column footer={<b>{selectedPRDetail.Header?.HeaderTaxValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} />
                                        <Column footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                                        <Column footer={<b>{selectedPRDetail.Header?.HeaderVatValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} />
                                        <Column footerStyle={{ color: "#ff5a00" }} footer={<b>{selectedPRDetail.Header?.HeaderNetValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} />
                                    </Row>
                                </ColumnGroup>
                            }>
                                <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                                <Column field="memo_number" header="PM No." />
                                <Column field="ItemName" header="Item Name" />
                                <Column field="Qty" header="Qty" body={(row) => row.Qty?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                                <Column field="UOMName" header="UOM" />
                                <Column field="UnitPrice" header="Unit Price" body={(row) => row.UnitPrice?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                                <Column field="DiscountValue" header="Discount" body={(row) => row.DiscountValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                                <Column field="taxname" header="Tax" />
                                <Column field="TaxPerc" header="Tax %" />
                                <Column field="TaxValue" header="Tax Amount" body={(row) => row.TaxValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                                <Column field="vatPerc" header="VAT %" />
                                <Column field="vatValue" header="VAT Amount" body={(row) => row.vatValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                                <Column field="NetTotal" bodyStyle={{ color: "#ff5a00" }} header="Total Amount" body={(row) => row.NetTotal?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                            </DataTable>

                            <Row className="mt-3">
                                <Col>
                                    <Label>PM Remarks</Label>
                                    <Card className="p-2 bg-light border">
                                        <div style={{ whiteSpace: "pre-wrap" }}>
                                            {selectedPRDetail.Header?.Memoremarks || "No pm remarks"}
                                        </div>
                                    </Card>
                                </Col>
                            </Row>

                            <Row className="mt-3">
                                <Col>
                                    <Label>Remarks</Label>
                                    <Card className="p-2 bg-light border">
                                        <div style={{ whiteSpace: "pre-wrap" }}>
                                            {selectedPRDetail.Header?.Remarks || "No remarks"}
                                        </div>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Attachments table if exists */}
                            {selectedPRDetail.Attachment && selectedPRDetail.Attachment.length > 0 && (
                                <Row className="mt-3">
                                    <DataTable tableStyle={{ width: "60%" }} value={selectedPRDetail.Attachment}>
                                        <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                                        <Column field="AttachmentName" header="Attachment" />
                                    </DataTable>
                                </Row>
                            )}
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <button type="button" className="btn btn-danger" onClick={() => setPrDetailVisible(false)}>
                        Close
                    </button>
                </ModalFooter>
            </Modal>

            {/* PO Details Modal */}
            <Modal isOpen={poDetailVisible} toggle={() => setPoDetailVisible(false)} size="xl">
                <ModalHeader toggle={() => setPoDetailVisible(false)}>
                    Purchase Order Details
                </ModalHeader>
                <ModalBody>
                    {selectedPODetail && (
                        <>
                            <div className="mb-4">
                                <Row>
                                    <Col md={4}>
                                        <div className="d-flex mb-2">
                                            <span className="bold-label" style={{ minWidth: "120px" }}>PO No.</span>
                                            <span>: {selectedPODetail.Header?.pono}</span>
                                        </div>
                                        <div className="d-flex mb-2">
                                            <span className="bold-label" style={{ minWidth: "120px" }}>PO Date</span>
                                            <span>: {formatDate(selectedPODetail.Header?.podate)}</span>
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="d-flex mb-2">
                                            <span className="bold-label" style={{ minWidth: "120px" }}>Supplier</span>
                                            <span className="text-uppercase">: {selectedPODetail.Header?.suppliername}</span>
                                        </div>
                                        <div className="d-flex mb-2">
                                            <span className="bold-label" style={{ minWidth: "120px" }}>PR No(s).</span>
                                            <span className="text-danger fw-bold">: {selectedPODetail.Header?.PRConcat || "N/A"}</span>
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="d-flex mb-2">
                                            <span className="bold-label" style={{ minWidth: "120px" }}>Currency</span>
                                            <span>: {selectedPODetail.Header?.currencycode || "N/A"}</span>
                                        </div>
                                        <div className="d-flex mb-2">
                                            <span className="bold-label" style={{ minWidth: "120px" }}>Net Total</span>
                                            <span className="fw-bold">: {selectedPODetail.Header?.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </Col>
                                </Row>
                            </div>

                            <hr />

                            <DataTable value={selectedPODetail.Requisition || []} className="p-datatable-sm" rowClassName={() => "align-middle"}>
                                <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center", width: '3rem' }} />
                                <Column field="prnumber" header="PR No." headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} body={(r) => <span className="text-danger fw-bold">{r.prnumber}</span>} />
                                <Column field="groupname" header="Item Group" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} />
                                <Column field="itemname" header="Item Name" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} />
                                <Column field="qty" header="Qty" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} body={(r) => r.qty?.toLocaleString("en-US", { minimumFractionDigits: 3 })} />
                                <Column field="uom" header="UOM" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} />
                                <Column field="unitprice" header="Unit Price" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} style={{ textAlign: "right" }} body={(r) => r.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })} />
                                <Column field="discountvalue" header="Discount" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} style={{ textAlign: "right" }} body={(r) => r.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })} />
                                <Column field="taxperc" header="Tax %" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} style={{ textAlign: "center" }} />
                                <Column field="taxvalue" header="Tax Amt" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} style={{ textAlign: "right" }} body={(r) => r.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })} />
                                <Column field="vatperc" header="VAT %" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} style={{ textAlign: "center" }} />
                                <Column field="vatvalue" header="VAT Amt" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} style={{ textAlign: "right" }} body={(r) => r.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })} />
                                <Column
                                    field="nettotal"
                                    header="Total Amt"
                                    headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }}
                                    style={{ textAlign: "right" }}
                                    body={(r) => <b>{r.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</b>}
                                    footer={<b>{selectedPODetail.Header?.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</b>}
                                />
                            </DataTable>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <button type="button" className="btn btn-close-custom" onClick={() => setPoDetailVisible(false)}>
                        <i className="bx bx-window-close label-icon font-size-16 align-middle me-2"></i> Close
                    </button>
                </ModalFooter>
            </Modal>

            {/* IRN Details Modal */}
            <Modal isOpen={irnDetailVisible} toggle={() => setIrnDetailVisible(false)} size="xl">
                <ModalHeader toggle={() => setIrnDetailVisible(false)}>IRN Details</ModalHeader>
                <ModalBody>
                    {selectedIRNDetail && (
                        <>
                            {/* IRN Header Section */}
                            <Row className="mb-2">
                                {[
                                    ["IRN No.", selectedIRNDetail.IRN_Header?.irn_no],
                                    ["IRN Date", selectedIRNDetail.IRN_Header?.irn_date],
                                    ["Due Date", selectedIRNDetail.IRN_Header?.due_date],
                                    ["Inv Date", selectedIRNDetail.IRN_Header?.inv_date],
                                    ["Inv No.", selectedIRNDetail.IRN_Header?.inv_no],
                                    ["Currency", selectedIRNDetail.IRN_Header?.currency],
                                ].map(([label, val], i) => (
                                    <Col md="4" key={i} className="mb-2 d-flex align-items-center">
                                        <div className="bold font-size-13" style={{ minWidth: "100px", flexShrink: 0 }}>
                                            {label}
                                        </div>
                                        <div className="mx-2">:</div>
                                        <div className="text-dark font-size-13 text-nowrap text-truncate">
                                            {val || "NA"}
                                        </div>
                                    </Col>
                                ))}
                            </Row>

                            <hr className="my-2" />

                            {/* PO Header Section */}
                            <Row className="mb-2">
                                {[
                                    ["PO No.", (selectedIRNDetail.Header?.IsShortClosureSubmitted === 1 || selectedIRNDetail.Header?.isShortClosureSubmitted === 1 || selectedIRNDetail.Header?.IsShortClosureSubmitted === true || selectedIRNDetail.Header?.isShortClosureSubmitted === true) ? `${selectedIRNDetail.Header?.pono}-1` : selectedIRNDetail.Header?.pono],
                                    ["PO Date", formatDate(selectedIRNDetail.Header?.podate)],
                                    ["Supplier", selectedIRNDetail.Header?.suppliername],
                                ].map(([label, val], i) => (
                                    <Col md="4" key={i} className="mb-2 d-flex align-items-center">
                                        <div className="bold font-size-13" style={{ minWidth: "100px", flexShrink: 0 }}>
                                            {label}
                                        </div>
                                        <div className="mx-2">:</div>
                                        <div className="text-dark font-size-13 text-nowrap text-truncate">
                                            {val || "NA"}
                                        </div>
                                    </Col>
                                ))}
                            </Row>

                            <hr className="mb-4" />

                            <DataTable value={selectedIRNDetail.Requisition || []}>
                                <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                                <Column field="prnumber" header="PR No." />
                                <Column field="groupname" header="Item Group" />
                                <Column field="itemname" header="Item Name" />

                                <Column
                                    field="qty"
                                    header="Qty"
                                    body={(rowData) =>
                                        rowData.qty?.toLocaleString("en-US", { minimumFractionDigits: 3 })
                                    }
                                />
                                <Column field="uom" header="UOM" />
                                <Column
                                    field="unitprice"
                                    header="Unit Price"
                                    body={(rowData) =>
                                        rowData.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={selectedIRNDetail.Header?.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />

                                <Column
                                    field="discountvalue"
                                    header="Discount"
                                    body={(rowData) =>
                                        rowData.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={selectedIRNDetail.Header?.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />

                                <Column field="taxperc" header="Tax %" />

                                <Column
                                    field="taxvalue"
                                    header="Tax Amt"
                                    body={(rowData) =>
                                        rowData.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={selectedIRNDetail.Header?.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />

                                <Column field="vatperc" header="VAT %" />

                                <Column
                                    field="vatvalue"
                                    header="VAT Amt"
                                    body={(rowData) =>
                                        rowData.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={selectedIRNDetail.Header?.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />

                                <Column
                                    field="nettotal"
                                    header="Total Amt"
                                    body={(rowData) =>
                                        rowData.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={<b>{selectedIRNDetail.Header?.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</b>}
                                />
                            </DataTable>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <button type="button" className="btn btn-danger" onClick={() => setIrnDetailVisible(false)}>
                        <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Close
                    </button>
                </ModalFooter>
            </Modal>

            {/* GRN Details Modal */}
            <Modal isOpen={grnDetailVisible} toggle={() => setGrnDetailVisible(false)} size="xl">
                <ModalHeader toggle={() => setGrnDetailVisible(false)}>GRN Details</ModalHeader>
                <ModalBody>
                    {selectedGRNDetail && (
                        <>
                            <div className="mb-4">
                                <Row>
                                    <Col md={4}>
                                        <div className="d-flex mb-2">
                                            <span className="bold-label">GRN No.</span>
                                            <span>: {selectedGRNDetail.Header?.grnno || "N/A"}</span>
                                        </div>
                                        <div className="d-flex mb-2">
                                            <span className="bold-label">PO No(s).</span>
                                            <span>: {selectedGRNDetail.Header?.POConcat || "N/A"}</span>
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="d-flex mb-2">
                                            <span className="bold-label">GRN Date</span>
                                            <span>: {formatDate(selectedGRNDetail.Header?.grndate) || "N/A"}</span>
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="d-flex mb-2">
                                            <span className="bold-label">Supplier</span>
                                            <span className="text-uppercase">: {selectedGRNDetail.Header?.suppliername || "N/A"}</span>
                                        </div>
                                    </Col>
                                </Row>
                            </div>

                            <DataTable value={selectedGRNDetail.Details || []} responsiveLayout="scroll" className="p-datatable-sm" rowClassName={() => "align-middle"}>
                                <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center", width: '3rem' }} />
                                <Column field="pono" header="PO No." headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} />
                                <Column field="itemDescription" header="Item Description" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} />
                                <Column field="dono" header="DO No." headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} />
                                <Column field="dodate" header="DO Date" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} body={(rowData) => formatDate(rowData.dodate)} />
                                <Column field="poqty" header="PO Qty" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} body={(rowData) => (rowData.poqty || 0).toLocaleString()} />
                                <Column field="UOM" header="UOM" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} />
                                <Column field="alreadyrecqty" header="Recd Qty" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} body={(rowData) => (rowData.alreadyrecqty || 0).toLocaleString()} />
                                <Column field="oribalanceqty" header="Bal Qty" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} body={(rowData) => (rowData.oribalanceqty || 0).toLocaleString()} />
                                <Column field="grnQty" header="GRN Qty" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} body={(rowData) => (rowData.grnQty || 0).toLocaleString()} />
                                <Column field="containerno" header="Contnr No." headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} />
                            </DataTable>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <button type="button" className="btn btn-close-custom" onClick={() => setGrnDetailVisible(false)}>
                        <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i> Close
                    </button>
                </ModalFooter>
            </Modal>

            {/* Claim Details Modal */}
            <Modal isOpen={claimDetailVisible} toggle={() => setClaimDetailVisible(false)} size="xl">
                <style>{btnCircleStyle}</style>
                <div style={{ position: 'relative' }}>
                    {(selectedClaimDetail?.header?.ClaimCategoryId === 3 || selectedClaimDetail?.Header?.ClaimCategoryId === 3) && (
                        <span style={{ position: 'absolute', top: '15px', right: '50px', fontWeight: 'bold', color: '#333', fontSize: '12px', zIndex: 10 }}>F-BTG-PUR-05 (Rev.03)</span>
                    )}
                    <ModalHeader toggle={() => setClaimDetailVisible(false)}>Claim Details</ModalHeader>
                </div>
                <ModalBody>
                    {selectedClaimDetail && (() => {
                        const headerObj = selectedClaimDetail.header || selectedClaimDetail.Header || {};
                        return (
                            <>
                                <Row className="mb-3">
                                    {[
                                        ["Category Type", headerObj.claimcategory || headerObj.ClaimCategoryName || "N/A"],
                                        ["Application Date", headerObj.ApplicationDatevw || formatDate(headerObj.ClaimDate || headerObj.applicationdate)],
                                        ["Application No", headerObj.ApplicationNo || headerObj.ClaimNo || headerObj.claim_no || "N/A"],
                                        ["Department", headerObj.departmentname || headerObj.DeptName || "N/A"],
                                        ["Applicant", headerObj.applicantname || headerObj.Applicant_Name || "N/A"],
                                        ["Attachment", headerObj.AttachmentName ? (
                                            <button
                                                key="att-btn"
                                                type="button"
                                                className="btn d-flex align-items-center justify-content-between p-0"
                                                onClick={() => Swal.fire("Info", "Attachment feature coming soon", "info")}
                                                style={{ height: "20px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "blue", border: "none", background: "none" }}
                                            >
                                                <span style={{ flexGrow: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={headerObj.AttachmentName}>
                                                    {headerObj.AttachmentName}
                                                </span>
                                                <i className="mdi mdi-cloud-download mdi-18px text-primary ms-1"></i>
                                            </button>
                                        ) : "No Attachment"],
                                        ["Trans Currency", headerObj.transactioncurrency || headerObj.curr || "N/A"],
                                        ["HOD", headerObj.HOD_Name || "N/A"],
                                        ["Supplier", headerObj.SupplierName || headerObj.suppliername || "N/A"],
                                        ["Cost Center", headerObj.CostCenter || "N/A"],
                                        ["Claim Amt in TC", <b key="amt-val">{(headerObj.ClaimAmountInTC ?? headerObj.claimamountintc)?.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "0.00"}</b>],
                                        ["Payment Mode", headerObj.paymentmethodname || (headerObj.ModeOfPaymentId === 1 ? "Cash" : headerObj.ModeOfPaymentId === 2 ? "Bank Transfer" : "N/A")],
                                    ].map(([label, val], i) => (
                                        <Col md="4" key={i} className="mb-2">
                                            <div className="d-flex">
                                                <Label className="bold mb-0" style={{ width: "130px", fontSize: '13px' }}>{label}</Label>
                                                <span style={{ fontSize: '13px' }}>: {val || "N/A"}</span>
                                            </div>
                                        </Col>
                                    ))}
                                </Row>
                                <hr />
                                <DataTable value={selectedClaimDetail.details || []} responsiveLayout="scroll" className="p-datatable-sm">
                                    <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} headerStyle={{ width: '3rem', textAlign: 'center' }} />
                                    {(headerObj.ClaimCategoryId === 3) && (
                                        <Column field="pono" header="PO No" body={(rowData) => (
                                            <span className="btn btn-link p-0" style={{ cursor: 'pointer', textDecoration: 'none', color: "blue" }} onClick={() => rowData.poid && handleShowDetails(rowData)}>
                                                {rowData.pono || rowData.poid || "N/A"}
                                            </span>
                                        )} />
                                    )}
                                    {(headerObj.ClaimCategoryId === 3) && (
                                        <Column field="prnumber" header="PR No" body={(rowData) => (
                                            <span className="btn btn-link p-0" style={{ cursor: 'pointer', textDecoration: 'none', color: "blue" }} onClick={() => rowData.prid && handlePRClick(rowData.prid)}>
                                                {rowData.prnumber || rowData.prno || "N/A"}
                                            </span>
                                        )} />
                                    )}
                                    <Column field="claimtype" header="Claim Type" headerStyle={{ textAlign: 'center' }} />
                                    <Column field="PaymentDescription" header="Claim & Payment Description" headerStyle={{ textAlign: 'center' }} />
                                    <Column field="TotalAmount" header="Amount" style={{ textAlign: 'right' }} body={(r) => (r.TotalAmount || r.net_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} />
                                    <Column field="ExpenseDatevw" header="Expense Date" headerStyle={{ textAlign: 'center' }} body={(r) => r.ExpenseDatevw || formatDate(r.ExpenseDatevw || r.expensedate)} />
                                    <Column field="Purpose" header="Purpose" headerStyle={{ textAlign: 'center' }} />
                                </DataTable>

                                <Row className="mt-3">
                                    <Col md="12">
                                        <Label className="bold">Remarks</Label>
                                        <Input type="textarea" rows="2" disabled value={headerObj.Remarks || ""} />
                                    </Col>
                                </Row>

                                <Row className="mt-4">
                                    <Col md="9">
                                        <Table bordered responsive className="text-center font-size-12">
                                            <thead>
                                                <tr>
                                                    <th style={{ backgroundColor: "#B4DBE0" }} colSpan="3">Claim</th>
                                                    <th style={{ backgroundColor: "#E6E4BC" }} colSpan="2">PPP</th>
                                                    <th style={{ backgroundColor: "#FFE9F5" }} colSpan="2">Vouchers</th>
                                                </tr>
                                                <tr>
                                                    <th style={{ backgroundColor: "#B4DBE0" }}>HOD</th>
                                                    <th style={{ backgroundColor: "#B4DBE0" }}>GM</th>
                                                    <th style={{ backgroundColor: "#B4DBE0" }}>Director</th>
                                                    <th style={{ backgroundColor: "#E6E4BC" }}>GM</th>
                                                    <th style={{ backgroundColor: "#E6E4BC" }}>Director</th>
                                                    <th style={{ backgroundColor: "#FFE9F5" }}>Director</th>
                                                    <th style={{ backgroundColor: "#FFE9F5" }}>CEO</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td><Button className={`btn-circle ${getSeverity(headerObj.ClmhodStatus)}`} /></td>
                                                    <td><Button className={`btn-circle ${getSeverity(headerObj.ClmgmStatus)}`} /></td>
                                                    <td><Button className={`btn-circle ${getSeverity(headerObj.ClmDrStatus)}`} /></td>
                                                    <td><Button className={`btn-circle ${getSeverity(headerObj.PPPgmStatus)}`} /></td>
                                                    <td><Button className={`btn-circle ${getSeverity(headerObj.PPPDrStatus)}`} /></td>
                                                    <td><Button className={`btn-circle ${getSeverity(headerObj.VouCmrStatus)}`} /></td>
                                                    <td><Button className={`btn-circle ${getSeverity(headerObj.VouDrStatus)}`} /></td>
                                                </tr>
                                            </tbody>
                                        </Table>
                                    </Col>
                                </Row>

                                <div className="d-flex gap-3 mt-2 font-size-12">
                                    <span><Button className="btn-circle btn-success me-1" /> Approved</span>
                                    <span><Button className="btn-circle btn-warning me-1" /> Discussed</span>
                                    <span><Button className="btn-circle btn-secondary me-1" /> Yet to Act</span>
                                </div>
                            </>
                        );
                    })()}
                </ModalBody>
                <ModalFooter>
                    <button type="button" className="btn btn-danger" onClick={() => setClaimDetailVisible(false)}>
                        Close
                    </button>
                </ModalFooter>
            </Modal>
            {/* ===== Blanket / Short Closure PO History Modal ===== */}
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
                            ) : (
                                <p className="text-muted mb-3">Original PO (<b>{blanketPoViewData.originalPono}</b>) could not be loaded.</p>
                            )}

                            {/* ====== SECTION 2: BLANKET PO ====== */}
                            <p style={{ fontWeight: "bold", fontSize: "15px", marginTop: "20px", marginBottom: "15px", color: "#333" }}>BlanketPO Details</p>
                            <Row className="mb-3">
                                <Col md={4}>
                                    <div className="d-flex mb-2 align-items-center">
                                        <span style={{ minWidth: "140px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>BlanketPO No.</span>
                                        <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {blanketPoViewData.blanketPO.Header?.pono || "N/A"}</span>
                                    </div>
                                    <div className="d-flex mb-2 align-items-center">
                                        <span style={{ minWidth: "140px", fontSize: "14px", color: "#333", fontWeight: "normal" }}>BlanketPO Value</span>
                                        <span style={{ fontSize: "14px", color: "#333", fontWeight: "normal" }}>: {(blanketPoViewData.blanketGRNs || []).reduce((s, r) => s + (parseFloat(r.NetTotal) || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
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

                            <p style={{ fontWeight: "bold", fontSize: "15px", marginTop: "15px", marginBottom: "10px", color: "#333" }}>GRN Details</p>
                            <div style={{ overflowX: "auto" }}>
                                <table className="table table-bordered table-sm mb-0" style={{ fontSize: "12px" }}>
                                    <thead>
                                        <tr>
                                            <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Serial No</th>
                                            <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>GRN No</th>
                                            <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Item Group</th>
                                            <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Item Name</th>
                                            <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Qty</th>
                                            <th className="text-center" style={{ backgroundColor: "#0066a6", color: "white", borderColor: "#0066a6" }}>Uom</th>
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
                                        {(blanketPoViewData.blanketGRNs || []).map((row, idx) => (
                                            <tr key={idx}>
                                                <td className="text-center">{idx + 1}</td>
                                                <td className="text-center">{row.GRNNo || ""}</td>
                                                <td>{row.ItemGroup || ""}</td>
                                                <td>{row.ItemName || ""}</td>
                                                <td className="text-center">{parseFloat(row.Qty || 0).toLocaleString("en-US", { minimumFractionDigits: 3 })}</td>
                                                <td className="text-center">{row.Uom || ""}</td>
                                                <td className="text-center">{parseFloat(row.UnitPrice || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                <td className="text-center">{parseFloat(row.DiscountAmt || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                <td className="text-center">{row.TaxPerc ?? 0}</td>
                                                <td className="text-center">{parseFloat(row.TaxAmt || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                <td className="text-center">{row.VatPerc ?? 0}</td>
                                                <td className="text-center">{parseFloat(row.VatAmt || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                <td className="text-center" style={{ color: "#ff5a00", fontWeight: "bold" }}>{parseFloat(row.NetTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))}
                                        {(blanketPoViewData.blanketGRNs || []).length === 0 && (
                                            <tr><td colSpan={13} className="text-center text-muted">No items found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : null}
                </ModalBody>
                <ModalFooter style={{ borderTop: "none" }}>
                    <button type="button" className="btn text-white" style={{ backgroundColor: "#d9534f", borderColor: "#d9534f", padding: "8px 20px" }} onClick={() => setBlanketPoViewVisible(false)}>
                        <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Close
                    </button>
                </ModalFooter>
            </Modal>
        </>
    );
};

export default ProcurementsManagePurchaseOrder;