import React, { useState, useEffect } from "react";
import {
  Card,
  Col,
  Container,
  Row,
  Modal,
  ModalBody,
  FormGroup,
  InputGroup, Input,
  ModalHeader,
  ModalFooter, Label
} from "reactstrap";
import Flatpickr from "react-flatpickr";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import Select from "react-select";
import { FilterMatchMode, FilterOperator } from "primereact/api";
import Breadcrumbs from "../../../components/Common/Breadcrumb";
import { UncontrolledAlert } from "reactstrap";
import { Tag } from "primereact/tag";
import { Dropdown } from "primereact/dropdown";
import { AutoComplete } from "primereact/autocomplete";
import Swal from "sweetalert2";
import nodatafound from "assets/images/no-data.png";
import { useHistory } from "react-router-dom";
import {
  GetAllIRNList,
  GetInvoiceReceiptAll,
  GetPurchaseRequisitionSupplierList, GetByIdPurchaseOrder, GetPRNoBySupplierAndCurrency
} from "common/data/mastersapi";
import PaymentHistory from "./procurements-irn-payment-history";
const renderValueOrDash = value =>
  value !== null && value !== undefined && value !== "" ? value : "-";

const initFilters = () => ({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },

  receipt_no: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
  },
  receipt_Date: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
  },
  suppliername: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
  },
  invoice_dt: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
  },
  invoice_no: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
  },
  due_dt: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
  },
  irnstatus: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
  },
  createddate: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
  totalamount: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
  createdbyName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
});

const getUserDetails = () => {
  if (localStorage.getItem("authUser")) {
    const obj = JSON.parse(localStorage.getItem("authUser"))
    return obj;
  }
}

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const InvoiceReceipt = () => {

  const [POdetailVisible, setPODetailVisible] = useState(false);
  const [selectedPODetail, setSelectedPODetail] = useState({});

  const [UserData, setUserData] = useState(null);
  const isRestrictedUser = [159, 160, 161, 163, 165].includes(UserData?.u_id);
  const [autoOptions, setAutoOptions] = useState([]);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const history = useHistory();
  const [selectedAutoItem, setSelectedAutoItem] = useState(null);
  const [selectedFilterType, setSelectedFilterType] = useState(null);
  const [filters, setFilters] = useState(initFilters());
  const [autoSuggestions, setAutoSuggestions] = useState([]);
  const [orgId, setOrgId] = useState(1);
  const [branchId, setBranchId] = useState(1);
  const [statuses] = useState([
    { label: 'Saved', value: 'Saved' },
    { label: 'IG', value: 'IG' },
  ]);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const [IRNList, setIRNList] = useState([]);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [selectedIrn, setSelectedIrn] = useState(null);


  const getSeverity = (status) => {
    if (status === "Saved") return "danger";
    if (status === "Generated") return "success";
    return "info"; // fallback
  };

  const FilterTypes = [
    { name: "Supplier", value: 1 },
    { name: "IRN Date", value: 2 }
  ];

  const getDynamicLabel = () => {
    if (selectedFilterType?.value === 1) return "Supplier";
    if (selectedFilterType?.value === 2) return "IRN Date";
    return "";
  };

  const loadSuggestions = (e) => { };
  const fetchAllIRN = async () => {
    const userData = getUserDetails();
    const res = await GetAllIRNList(
      branchId,
      orgId,
      0,
      0,
      '',
      '', userData?.u_id
    );
    if (res.status) {
      setIRNList(res.data);
    }
  };


  useEffect(() => {
    const loadOptions = async () => {
      let result = [];
      result = await GetPurchaseRequisitionSupplierList(orgId, branchId, "%");
      setAutoOptions(
        (result?.data || []).map(item => ({
          label: item.SupplierName,
          value: item.SupplierID,
        }))
      );
    };
    const userData = getUserDetails();
    setUserData(userData);
    fetchAllIRN();
    loadOptions();
  }, []);

  const onGlobalFilterChange = e => {
    const value = e.target.value || "";
    setFilters(prev => ({ ...prev, global: { ...prev.global, value } }));
    setGlobalFilterValue(value);
  };

  const searchData = async () => {
    let supplierId = 0;
    let irnId = 0;
    let from = "";
    let to = "";

    if (selectedFilterType?.value === 1) {
      // Supplier Filter
      supplierId = selectedAutoItem?.value || 0;
      if (supplierId === 0) {
        Swal.fire("Warning", "Please select a supplier", "warning");
        return;
      }
      from = "";
      to = "";
    } else if (selectedFilterType?.value === 2) {
      // Due Date Filter
      from = formatDate(fromDate);
      to = formatDate(toDate);
      if (!from || !to) {
        Swal.fire("Warning", "Please select both From Date and To Date", "warning");
        return;
      }
      supplierId = 0;
    }

    try {
      const userData = getUserDetails();
      const res = await GetAllIRNList(
        branchId,
        orgId,
        supplierId,
        irnId,
        from,
        to, userData?.u_id
      );

      if (res?.status) {
        setIRNList(res.data);
      } else {
        setIRNList([]);
        Swal.fire("Info", "No records found", "info");
      }
    } catch (error) {
      Swal.fire("Error", "Failed to fetch IRN list", "error");
    }
  };

  const cancelFilter = async () => {
    setSelectedFilterType(null);
    setSelectedAutoItem(null);
    setFromDate(null);
    setToDate(null);

    try {
      const userData = getUserDetails();

      const res = await GetAllIRNList(
        branchId,
        orgId,
        0,    // supplierId
        0,    // irnId
        "",   // fromDate
        "", userData?.u_id   // toDate
      );

      if (res?.status) {
        setIRNList(res.data);
      } else {
        setIRNList([]);
      }
    } catch (error) {
      Swal.fire("Error", "Failed to reset filter", "error");
    }
  };

  const linkAddInvoice = async () => {

    history.push({ pathname: "/AddInvoiceReceipt/0" });
  };


  const editRow = (rowData) => {
    // console.log('Edit row:', rowData);
    history.push(`/AddInvoiceReceipt/${rowData.receiptnote_hdr_id}`);
  };

  const actionBodyTemplate = (rowData) => {
    debugger
    return (
      <div className="d-flex align-items-center justify-content-center gap-3">
        {(!isRestrictedUser && rowData.irnstatus === "Saved") || Number(UserData?.u_id) === 133 ? (
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



  // const statusBodyTemplate = (rowData) => {
  //   const statusShort = rowData.Status === "Saved" ? "S" : rowData.Status === "Posted" ? "P" : rowData.Status;
  //   return <Tag value={statusShort} severity={getSeverity(rowData.Status)} />;
  // };

  const statusBodyTemplate = (rowData) => {
    const statusShort = rowData.irnstatus === "Saved" ? "S" :
      rowData.irnstatus === "Generated" ? "IG" :
        rowData.irnstatus;
    return <Tag value={statusShort} severity={getSeverity(rowData.irnstatus)} />;
  };

  const statusFilterTemplate = (options) => {
    return <Dropdown value={options.value} options={statuses} onChange={(e) => options.filterCallback(e.value, options.index)}
      itemTemplate={statusItemTemplate} placeholder="Select One" className="p-column-filter" showClear />;
  };

  const statusItemTemplate = (option) => {
    return <Tag value={option.label} severity={getSeverity(option.value)} />;
  };

  const clearFilter = () => {
    setSelectedFilterType(null);
    setSelectedAutoItem(null);
    setFilters(initFilters());
    setGlobalFilterValue('');
  };

  const renderHeader = () => {
    return (
      <div className="row align-items-center g-3 clear-spa">
        <div className="col-12 col-lg-6">
          <Button className="btn btn-danger btn-label" onClick={clearFilter}>
            <i className="mdi mdi-filter-off label-icon" /> Clear
          </Button>
        </div>
        <div className="col-12 col-lg-3 text-end">
          <span className="me-4">
            <Tag value="S" severity="danger" /> Saved
          </span>
          <span className="me-1">
            <Tag value="IG" severity="success" /> Invoice Generated
          </span>
        </div>
        <div className="col-12 col-lg-3">
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
  };
  const [detailVisible, setDetailVisible] = useState(false);

  const [selectedDetail, setSelectedDetail] = useState({
    Details: [
      {
        SupplierName: "ABC Traders Pvt Ltd",
        grnNo: "GRN001",
        invoiceNo: "INV-1001",
        invoiceDate: "2025-08-01T00:00:00",
        dueDate: "2025-08-31T00:00:00",
        attachments: [
          { name: "invoice-1001.pdf", url: "/files/invoice-1001.pdf" },
          { name: "support-doc-1.png", url: "/files/support-doc-1.png" }
        ]
      },
      {
        SupplierName: "XYZ Supplies Co.",
        grnNo: "GRN002",
        invoiceNo: "INV-2002",
        invoiceDate: "2025-08-05T00:00:00",
        dueDate: "2025-09-05T00:00:00",
        attachments: [
          { name: "invoice-2002.pdf", url: "/files/invoice-2002.pdf" }
        ]
      },
      {
        SupplierName: "Global Importers",
        grnNo: "GRN003",
        invoiceNo: "INV-3003",
        invoiceDate: "2025-08-10T00:00:00",
        dueDate: "2025-09-10T00:00:00",
        attachments: [] // no files uploaded
      }
    ]
  });
  const [visible, setVisible] = useState(false);
  const [attachments, setAttachments] = useState([]);

  // Mock API or data fetch for attachments
  const fetchAttachments = (irnId) => {
    // Replace with API call
    const mockFiles = [
      { id: 1, filename: "invoice.pdf", url: "/files/invoice.pdf" },
      { id: 2, filename: "supporting_doc.xlsx", url: "/files/supporting_doc.xlsx" },
    ];
    setAttachments(mockFiles);
    setVisible(true);
  };

  const handleShowDetails = async (row) => {
    setDetailVisible(true);
  };

  const actionclaimBodyTemplate = (rowData) => {
    return <span style={{ cursor: "pointer", color: "blue" }} className="btn-rounded btn btn-link"
      onClick={() => handleShowDetails(rowData)}>{rowData.receipt_no}</span>;
  };
  const handleShowPODetails = async (row) => {
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
            // IRN Header data injection
            irn_no: row.receipt_no,
            irn_date: row.receipt_Date,
            supplier_name: row.suppliername,
            inv_no: row.invoice_no,
            inv_date: row.invoice_dt,
            due_date: row.due_dt
          };
        });
      } else {
        requisition = requisition.map((r) => ({
          ...r,
          PR_NUMBER: "NA",
          PRDisplay: "NA",
          // IRN Header data injection
          irn_no: row.receipt_no,
          irn_date: row.receipt_Date,
          supplier_name: row.suppliername,
          inv_no: row.invoice_no,
          inv_date: row.invoice_dt,
          due_date: row.due_dt
        }));
      }

      // Collect unique PR numbers for header concat
      let headerPRNumbers = [
        ...new Set(requisition.map((r) => r.prnumber).filter(Boolean)),
      ].join(", ");

      if (!headerPRNumbers) headerPRNumbers = "NA";

      setSelectedPODetail({
        ...res.data,
        IRN_Header: {
          irn_no: row.receipt_no || row.Receipt_No,
          irn_date: row.receipt_Date || row.Receipt_Date,
          supplier: row.suppliername || row.SupplierName,
          inv_no: row.invoice_no || row.Invoice_No,
          inv_date: row.invoice_dt || row.Invoice_Dt,
          due_date: row.due_dt || row.Due_Dt
        },
        Header: {
          ...res.data.Header,
          PRConcat: headerPRNumbers, // header field with PR numbers
        },
        Details: requisition, // requisition rows are the detail lines
      });

      setPODetailVisible(true);

      // if you later add attachments for PO
      // setPreviewUrl(res.data.Header.filepath || "");
      // setFileName(res.data.Header.filename || "");
    } else {
      Swal.fire("Error", "Data is not available", "error");
    }
  };

  const actionIRNBodyTemplate = (rowData) => {
    return <span style={{ cursor: "pointer", color: "blue" }} className="btn-rounded btn btn-link"
      onClick={() => handleShowPODetails(rowData)}>{rowData.receipt_no}</span>;
  };
  const [showModal, setShowModal] = useState(false);
  const [selectedRowFiles, setSelectedRowFiles] = useState([]);

  const toggleModal = () => setShowModal(!showModal);

  const openAttachments = (rowData) => {
    // Assuming rowData.attachments = files for that row
    setSelectedRowFiles(rowData.attachments || []);
    setShowModal(true);
  };


  const attachmentTemplate = (rowData) => {
    return (
      <Button className="btn btn-success " onClick={() => openAttachments(rowData)}>
        <i className="fa fa-paperclip label-icon font-size-14 align-middle me-2"></i> Attachments
      </Button>
    );
  };

  const paymentTemplate = (rowData) => {
    return (
      <span title="View Remarks" style={{ cursor: 'pointer' }}
        onClick={() => {
          setSelectedIrn(rowData.poid ? [rowData.poid] : []);
          setPaymentVisible(true);
        }}
      >
        <i className="mdi mdi-eye font-size-26 me-2" style={{ fontSize: '1.5rem', color: '#17a2b8' }}></i>
      </span>
    );
  };

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Procurement" breadcrumbItem="Invoice Receipt Note" />

        {/* Filters/Search Area */}
        <Row>


          <Card className="search-top">
            <div className="row align-items-end g-3 quotation-mid p-3">
              {/* User Name */}
              <div className="col-12 col-lg-3 mt-1">
                <div className="d-flex align-items-center gap-2">
                  <div className="col-12 col-lg-4 col-md-4 col-sm-4 text-center">
                    <label htmlFor="Search_Type" className="form-label mb-0">Search By</label></div>
                  <div className="col-12 col-lg-8 col-md-8 col-sm-8">
                    <Select
                      name="filtertype"
                      options={FilterTypes.map(f => ({ label: f.name, value: f.value }))}
                      placeholder="Select Filter Type"
                      classNamePrefix="select"
                      isClearable
                      value={selectedFilterType}
                      onChange={(selected) => {
                        setSelectedFilterType(selected);
                        setSelectedAutoItem(null);
                      }}
                    />
                  </div>
                </div>
              </div>

              {selectedFilterType?.value === 1 && (
                <div className="col-12 col-lg-4 mt-1">
                  <div className="d-flex align-items-center gap-2">
                    <div className="col-12 col-lg-4 col-md-4 col-sm-4 text-center">
                      <label className="form-label mb-0">{getDynamicLabel()}</label>
                    </div>
                    <div className="col-12 col-lg-8 col-md-8 col-sm-8">


                      <Select
                        name="dynamicSelect"
                        options={autoOptions}
                        placeholder={`Search ${selectedFilterType.label}`}
                        classNamePrefix="select"
                        isClearable
                        isSearchable
                        value={selectedAutoItem}
                        onChange={(selected) => setSelectedAutoItem(selected)}
                      />


                    </div>
                  </div>
                </div>
              )}

              {selectedFilterType?.value === 2 && (
                <div className="col-12 col-lg-6 mt-1">
                  <div className="row align-items-center">
                    <div className="col-12 col-lg-3 col-md-3 col-sm-3 text-center">
                      <label className="form-label mb-0">From Date</label>
                    </div>
                    <div className="col-12 col-lg-3 col-md-3 col-sm-3">
                      <Flatpickr
                        name="fromDate"
                        className="form-control"
                        value={fromDate || null}
                        onChange={(date) => setFromDate(date[0])}
                        options={{
                          altInput: true,
                          altFormat: "d-M-Y",
                          dateFormat: "Y-m-d",
                        }}
                      />
                    </div>

                    <div className="col-12 col-lg-3 col-md-3 col-sm-3 text-center">
                      <label className="form-label mb-0">To Date</label>
                    </div>
                    <div className="col-12 col-lg-3 col-md-3 col-sm-3">
                      <Flatpickr
                        name="toDate"
                        className="form-control"
                        value={toDate || null}
                        onChange={(date) => setToDate(date[0])}
                        options={{
                          altInput: true,
                          altFormat: "d-M-Y",
                          dateFormat: "Y-m-d",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className={`col-12 ${selectedFilterType?.value === 1
                ? 'col-lg-5' // Supplier uses col-lg-4
                : selectedFilterType?.value === 2
                  ? 'col-lg-3' // Due Date uses col-lg-6
                  : 'col-lg-9' // Default (nothing selected)
                } d-flex justify-content-end flex-wrap gap-2`}
              >
                <button type="button" className="btn btn-info" onClick={searchData}> <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i> Search</button>
                <button type="button" className="btn btn-danger" onClick={cancelFilter}><i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>Cancel</button>
                {!isRestrictedUser && (
                  <button type="button" className="btn btn-success" onClick={linkAddInvoice}><i className="bx bx-plus label-icon font-size-16 align-middle me-2"></i>New</button>
                )}
              </div>
            </div>
          </Card>
        </Row>

        {/* Users Table */}
        <Row>
          <Col lg="12">
            <Card className="p-3">
              <DataTable
                value={IRNList}
                paginator
                header={renderHeader()}
                rows={20}
                dataKey="receiptnote_hdr_id"
                filters={filters}
                globalFilterFields={[
                  "receipt_no",
                  "receipt_Date",
                  "suppliername",
                  "invoice_dt",
                  "invoice_no",
                  "due_dt",
                  "grnno",
                  "grndate",
                  "filename",
                  , 'createddate', 'totalamount', 'createdbyName'
                ]}
                emptyMessage="No IRN found."
                onFilter={(e) => setFilters(e.filters)}
              >
                {/* <Column field="receipt_no" header="IRN No." body={actionclaimBodyTemplate} filter filterPlaceholder="Search by IRN No" style={{ width: "12%" }} /> */}
                {/* <Column field="receipt_no" header="IRN No." filter filterPlaceholder="Search by IRN No" 
                style={{ width: "10%" }} /> */}

                <Column
                  field="receipt_no"
                  header="IRN No."
                  filter
                  filterPlaceholder="Search by IRN No"
                  className="text-left"
                  style={{ width: "10%" }}
                  body={actionIRNBodyTemplate}
                />
                <Column field="receipt_Date" header="IRN Date" filter filterPlaceholder="Search by Date" style={{ width: "10%" }} />
                <Column field="suppliername" header="Supplier" filter filterPlaceholder="Search by Supplier" style={{ width: "20%" }} />
                <Column field="invoice_dt" header="Inv Date" filter filterPlaceholder="Search by Inv Date" style={{ width: "12%" }} />
                <Column field="invoice_no" header="Inv No" filter filterPlaceholder="Search by Inv No" style={{ width: "10%" }} />
                <Column field="due_dt" header="Due Date" filter filterPlaceholder="Search by Due Date" style={{ width: "10%" }} />
                {/* <Column
                    field="createddate"
                    header="Created Date"
                    filter
                    filterPlaceholder="Search by created date"
                    className="text-left"
                    style={{ width: "10%" }}
                /> */}
                <Column
                  field="totalamount"
                  header="Total Amt"
                  filter
                  filterPlaceholder="Search by Total Amt"
                  className="text-right"

                  body={(rowData) =>
                    rowData.totalamount?.toLocaleString('en-US', {
                      style: 'decimal',
                      minimumFractionDigits: 2
                    })
                  }
                  style={{ width: "10%" }}
                />
                <Column
                  field="createdbyName"
                  header="Created By"
                  filter
                  filterPlaceholder="Search by created by"
                  className="text-left"
                />
                <Column field="irnstatus" header="Status" className="text-center" body={statusBodyTemplate} />
                <Column header="Action" body={actionBodyTemplate} showFilterMatchMode={false} className="text-center" style={{ width: "100px" }} />
                <Column className="text-center" body={paymentTemplate} header="Payment History" />
              </DataTable>

            </Card>
          </Col>
        </Row>
      </Container>
      <Modal isOpen={detailVisible} toggle={() => setDetailVisible(false)} size="xl">
        <ModalHeader toggle={() => setDetailVisible(false)}>Invoice Receipt Note Details</ModalHeader>
        <ModalBody>
          {selectedDetail && (
            <>
              <DataTable value={selectedDetail?.Details || []}>
                {/* Serial No. */}
                <Column
                  header="S.No"
                  body={(_, { rowIndex }) => rowIndex + 1}
                />

                {/* Supplier */}
                <Column
                  field="SupplierName"
                  header="Supplier"
                />

                {/* GRN No. */}
                <Column
                  field="grnNo"
                  header="GRN No."
                />

                {/* Invoice No. */}
                <Column
                  field="invoiceNo"
                  header="Invoice No."
                />

                {/* Invoice Date */}
                <Column
                  field="invoiceDate"
                  header="Invoice Date"
                  body={(row) => row.invoiceDate ? row.invoiceDate.split("T")[0] : ""}
                />

                {/* Due Date */}
                <Column
                  field="dueDate"
                  header="Due Date"
                  body={(row) => row.dueDate ? row.dueDate.split("T")[0] : ""}
                />

                {/* Upload Invoice */}
                <Column body={attachmentTemplate} header="Attachments" />


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
      <Modal isOpen={showModal} toggle={toggleModal}>
        <ModalHeader toggle={toggleModal}>Attachments</ModalHeader>
        <ModalBody>
          {selectedRowFiles.length > 0 ? (
            <DataTable value={selectedRowFiles} responsiveLayout="scroll">
              <Column
                header="#"
                body={(_, { rowIndex }) => rowIndex + 1}
                style={{ width: "50px" }}
              />
              <Column
                header="Attachment"
                body={(row) => (
                  <a href={row.url} target="_blank" rel="noopener noreferrer">
                    {row.name}
                  </a>
                )}
              />
            </DataTable>
          ) : (
            <p>No files uploaded.</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleModal}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
      <Modal isOpen={paymentVisible} toggle={() => setPaymentVisible(false)} size="xl">
        <ModalHeader toggle={() => setPaymentVisible(false)}>
          Payment History
        </ModalHeader>
        <ModalBody>
          {selectedIrn && selectedIrn.length > 0 ? (
            <PaymentHistory poId={selectedIrn} />
          ) : (
            <div>No Payment History found.</div>
          )}
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setPaymentVisible(false)}
          >
            <i className="bx bx-x label-icon font-size-16 align-middle me-2"></i> Close
          </button>
        </ModalFooter>
      </Modal>


      <Modal isOpen={POdetailVisible} toggle={() => setPODetailVisible(false)} size="xl">
        <ModalHeader toggle={() => setPODetailVisible(false)}>IRN Details</ModalHeader>
        <ModalBody>
          {selectedPODetail && (
            <>
              {/* IRN Header Section */}
              <Row className="mb-2">
                {[
                  ["IRN No.", selectedPODetail.IRN_Header?.irn_no],
                  ["IRN Date", selectedPODetail.IRN_Header?.irn_date],
                  ["Due Date", selectedPODetail.IRN_Header?.due_date],
                  ["Inv Date", selectedPODetail.IRN_Header?.inv_date],
                  ["Inv No.", selectedPODetail.IRN_Header?.inv_no],
                  ["Currency", selectedPODetail.Header?.currencycode],
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
                  ["PO No.", (selectedPODetail.Header?.IsShortClosureSubmitted === 1 || selectedPODetail.Header?.isShortClosureSubmitted === 1 || selectedPODetail.Header?.IsShortClosureSubmitted === true || selectedPODetail.Header?.isShortClosureSubmitted === true) ? `${selectedPODetail.Header?.pono}-1` : selectedPODetail.Header?.pono],
                  ["PO Date", formatDate(selectedPODetail.Header?.podate)],
                  ["Supplier", selectedPODetail.Header?.suppliername],
                ].map(([label, val], i) => (
                  <Col md="4" key={i} className="mb-2 d-flex align-items-center">
                    <div className="bold font-size-13" style={{ minWidth: "100px", flexShrink: 0 }}>
                      {label}
                    </div>
                    <div className="mx-2">:</div>
                    <div
                      className="text-dark font-size-13 text-nowrap text-truncate"
                    >
                      {val || "NA"}
                    </div>
                  </Col>
                ))}
              </Row>

              <hr className="mb-4" />

              <DataTable value={selectedPODetail.Requisition}>
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
                  footer={selectedPODetail.Header?.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                />

                <Column
                  field="discountvalue"
                  header="Discount"
                  body={(rowData) =>
                    rowData.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                  }
                  footer={selectedPODetail.Header?.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                />

                <Column field="taxperc" header="Tax %" />

                <Column
                  field="taxvalue"
                  header="Tax Amt"
                  body={(rowData) =>
                    rowData.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                  }
                  footer={selectedPODetail.Header?.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                />

                <Column field="vatperc" header="VAT %" />

                <Column
                  field="vatvalue"
                  header="VAT Amt"
                  body={(rowData) =>
                    rowData.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                  }
                  footer={selectedPODetail.Header?.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                />

                <Column
                  field="nettotal"
                  header="Total Amt"
                  body={(rowData) =>
                    rowData.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                  }
                  footer={<b>{selectedPODetail.Header?.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</b>}
                />
              </DataTable>

            </>
          )}
        </ModalBody>

        <ModalFooter>
          <button type="button" className="btn btn-danger" onClick={() => setPODetailVisible(false)}>
            <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Close
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default InvoiceReceipt;