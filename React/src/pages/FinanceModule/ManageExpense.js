import React, { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Col,
  Container,
  Row,
  Button,
  Modal,
  ModalBody,
  ModalHeader,
} from "reactstrap";
import Select from "react-select";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import { Tag } from "primereact/tag";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import { Label } from "reactstrap";
import { format } from "date-fns";
import { getPettyCashList, getPettyCashCategories, getPettyCashExpenseTypes, getPettyCashCurrency } from "../../../src/common/data/mastersapi";
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

const ManageExpense = () => {
  const history = useHistory();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [typeMap, setTypeMap] = useState({});

  // Set default dates: fromDate = 1 week ago, toDate = today
  const getDefaultFromDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  };

  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(null);

  useEffect(() => {
    loadCurrencies();
    if (fromDate && toDate) {
      fetchExpenses(true);
    }
  }, []);

  const loadCurrencies = async () => {
    try {
      const res = await getPettyCashCurrency(1, 1);
      const allowed = ['IDR', 'USD', 'MYR', 'SGD', 'CNY'];
      const options = res
        .filter(c => allowed.includes(c.CurrencyCode || c.currency_code || c.Currency || c.currency))
        .map(c => ({
          value: c.CurrencyId || c.currencyid || c.id,
          label: c.Currency || c.CurrencyCode || c.currency || c.currency_code
        }));
      setCurrencyOptions(options);
      const idr = options.find(o => o.label === "IDR");
      if (idr) setSelectedCurrency(idr);
    } catch (err) {
      console.error("Failed to load currencies", err);
    }
  };

  const formatDateToISO = (d) => {
    if (!d) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const generateDailyVoucherID = (dateInput) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `PCV-${year}${month}${day}`;
  };

  const fetchExpenses = async (applyDateFilter = true) => {
    if (applyDateFilter && (!fromDate || !toDate)) {
      toast.warning("Please select both From and To dates");
      return;
    }
    try {
      setLoading(true);
      const branchId = 1;
      const orgId = 1;
      const pettyIdValue = 0;

      // Only apply date filter if explicitly requested and dates are set
      const fDate = (applyDateFilter && fromDate) ? formatDateToISO(fromDate) : null;
      const tDate = (applyDateFilter && toDate) ? formatDateToISO(toDate) : null;
      const curId = selectedCurrency ? selectedCurrency.value : 0;

      const [data, typesData] = await Promise.all([
        getPettyCashList(orgId, branchId, pettyIdValue, null, null, null, fDate, tDate, curId),
        getPettyCashExpenseTypes(orgId, branchId),
      ]);

      const tMap = {};
      typesData.forEach(t => tMap[t.id] = t.expense_type);
      setTypeMap(tMap);



      // Group items by pc_number
      const groups = {};
      data.forEach(item => {
        const pc = item.pc_number || `LEGACY-${item.pettycashid || item.PettyCashId}`;
        if (!groups[pc]) {
          groups[pc] = {
            pc_number: pc,
            VoucherNo: item.voucherno || item.VoucherNo,
            ExpDate: item.expdate || item.ExpDate,
            expense_type_id: item.expense_type_id,
            ExpenseDescription: item.expensedescription || item.ExpenseDescription,
            CurrencyCode: item.currencycode || item.CurrencyCode,
            Amount: 0,
            AmountIDR: 0,
            IsSubmitted: item.issubmitted || item.IsSubmitted,
            PettyCashId: item.pettycashid || item.PettyCashId, // Lead ID
            dailyVoucher: item.dailyvoucher || item.dailyVoucher,
            items: []
          };
        }
        groups[pc].Amount += parseFloat(item.amount || item.Amount || 0);
        groups[pc].AmountIDR += parseFloat(item.amountidr || item.AmountIDR || 0);
        groups[pc].items.push(item);

        // If any item in group is submitted, mark group as submitted
        if (item.issubmitted || item.IsSubmitted) groups[pc].IsSubmitted = 1;
      });

      const transformed = Object.values(groups).map(group => ({
        voucherNo: group.pc_number,
        expDate: new Date(group.ExpDate),
        expenseType: tMap[group.expense_type_id] || "-",
        expenseTypename: tMap[group.expense_type_id] || "-",
        expenseDescription: group.items.length > 1 ? `Batch: ${group.items.length} items` : group.ExpenseDescription,
        glcode: group.glcode || "",
        CurrencyCode: group.CurrencyCode,
        billNumber: group.VoucherNo,
        amountIDR: group.AmountIDR,
        amount: group.Amount,
        attachment: group.items.some(i => i.ExpenseFileName) ? { name: "Multiple" } : null,
        status: group.IsSubmitted ? "Posted" : "Saved",
        pettyCashId: group.PettyCashId,
        dailyVoucher: group.dailyVoucher || generateDailyVoucherID(group.ExpDate),
        raw: group.items[0]
      }));

      // Frontend filter as fallback
      const filtered = transformed.filter(ex => {
        if (!applyDateFilter || !fromDate || !toDate) return true;
        const d = new Date(ex.expDate);
        const f = new Date(fromDate); f.setHours(0, 0, 0, 0);
        const t = new Date(toDate); t.setHours(23, 59, 59, 999);
        return d >= f && d <= t;
      });

      setExpenses(filtered);

      // Populate dropdowns
      // Populate dropdowns - Metadata only for table display now
      // setPettyCashIdOptions([...]) - Removed
      // setExpTypeOptions([...]) - Removed

      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast.error("Failed to fetch expenses");
      console.error("Expense load error:", error);
    }
  };

  const handleGroupedPrint = () => {
    const content = document.getElementById("groupedPrintArea");
    const win = window.open('', '', 'width=900,height=800');
    win.document.write('<html><head><title>Petty Cash Vouchers</title></head><body>');
    win.document.write(content.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
  };

  const getSeverity = (status) => {
    switch (status) {
      case 'Posted': return 'success';
      case 'Saved': return 'danger';
      default: return 'info';
    }
  };

  const statusBodyTemplate = (rowData) => {
    if (rowData.voucherNo && rowData.voucherNo.startsWith("CLM")) {
      return null;
    }
    return (
      <Tag
        value={rowData.status === "Posted" ? "P" : "S"}
        severity={getSeverity(rowData.status)}
      />
    );
  };

  const clearFilter = () => {
    setFilters({
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    });
    setGlobalFilter("");
  };

  const actionBodyTemplate = (rowData) => {
    return (
      <div className="actions d-flex gap-2 justify-content-center">
        <span
          onClick={() => handleEdit(rowData)}
          title="Edit"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <i className="mdi mdi-square-edit-outline" style={{ fontSize: '1.5rem' }}></i>
        </span>
      </div>
    );
  };

  const [printGroup, setPrintGroup] = useState([]);
  const handleRowPrint = (rowData) => {
    // Current group is identified by pc_number (voucherNo in transformed data)
    // We want to print all items in that group
    const groupItems = rowData.items || [rowData.raw];
    setPrintGroup(groupItems);
    setPrintModalVisible(true);
  };

  const handleEdit = (rowData) => {
    const pettyCashData = rowData.raw;
    history.push(`/pettyCash/edit/${rowData.pettyCashId}`, { pettyCashData });
  };

  const exportToExcel = () => {
    const exportData = expenses.map((ex) => ({
      "Date": new Date(ex.expDate).toLocaleDateString(),
      "Expense Type": ex.expenseType,
      "Description": ex.expenseDescription,
      "GL Code": ex.glcode,
      "Currency": ex.CurrencyCode,
      "Bill Number": ex.billNumber,
      "Amount": ex.amount,
      "Amount (IDR)": ex.amountIDR,
      "Attachment": ex.attachment ? ex.attachment.name : "",
      "Status": ex.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(data, `Expenses-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const dAddOrder = () => { history.push("/pettyCash/add"); };

  const handleCancelFilters = () => {
    setFromDate(null);
    setToDate(null);
    setExpenses([]);
  };


  const renderHeader = () => (
    <div className="row align-items-center g-3">
      <div className="col-12 col-lg-6">
        <Button className="btn btn-danger btn-label" onClick={clearFilter} >
          <i className="mdi mdi-filter-off label-icon" /> Clear
        </Button>
      </div>
      <div className="col-12 col-lg-3 text-end">
        <span className="me-4"><Tag value="S" severity="danger" /> Saved</span>
        <span className="me-1"><Tag value="P" severity="success" /> Posted</span>
      </div>
      <div className="col-12 col-lg-3">
        <InputText
          type="search"
          value={globalFilter}
          className="form-control"
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Keyword Search"
        />
      </div>
    </div>
  );

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Finance" breadcrumbItem="Petty Cash" />

        <Row className="pt-2 pb-3 align-items-end g-2">
          <Col md="2">
            <Label className="fw-bold mb-1">From Date</Label>
            <Flatpickr
              className="form-control"
              options={{
                altInput: true,
                altFormat: "d-M-Y",
                dateFormat: "Y-m-d",
              }}
              value={fromDate}
              onChange={([date]) => setFromDate(date)}
            />
          </Col>
          <Col md="2">
            <Label className="fw-bold mb-1">To Date</Label>
            <Flatpickr
              className="form-control"
              options={{
                altInput: true,
                altFormat: "d-M-Y",
                dateFormat: "Y-m-d",
              }}
              value={toDate}
              onChange={([date]) => setToDate(date)}
            />
          </Col>
          <Col md="2">
            <Label className="fw-bold mb-1">Currency</Label>
            <Select
              options={currencyOptions}
              value={selectedCurrency}
              onChange={(opt) => setSelectedCurrency(opt)}
              className="flex-grow-1"
              placeholder="Currency"
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: '38px',
                  height: '38px'
                }),
                valueContainer: (base) => ({
                  ...base,
                  height: '38px',
                  padding: '0 6px'
                }),
                input: (base) => ({
                  ...base,
                  margin: '0',
                  padding: '0'
                }),
                indicatorsContainer: (base) => ({
                  ...base,
                  height: '38px'
                })
              }}
            />
          </Col>

          <Col className="d-flex justify-content-end gap-1 align-items-center">
            <button
              type="button"
              className="btn btn-info"
              onClick={() => fetchExpenses(true)}
            >
              <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i>
              Search
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleCancelFilters}
            >
              <i className="bx bx-x-circle label-icon font-size-16 align-middle me-2"></i>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={exportToExcel}
            >
              <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i>
              Export
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={dAddOrder}
              disabled={isSubmitting}
            >
              <i className="bx bx-plus label-icon font-size-16 align-middle me-2"></i>
              New
            </button>
          </Col>
        </Row>

        <Row>
          <Col lg="12">
            <Card className="shadow-sm">
              <CardBody>
                <DataTable
                  value={expenses}
                  loading={loading}
                  paginator
                  rows={25}
                  dataKey="pettyCashId"
                  filters={filters}
                  globalFilterFields={[
                    "CurrencyCode", "expDate",
                    "amount", "amountIDR", "attachment",
                    "expenseDescription",
                    "status", "voucherNo", "expenseTypename", "glcode", "dailyVoucher"
                  ]}
                  globalFilter={globalFilter}
                  emptyMessage="No expenses found."
                  showGridlines
                  size="small"
                  className="blue-bg"
                  header={renderHeader()}
                >

                  <Column field="expDate" header="Date" body={(d) => format(new Date(d.expDate || d.ExpDate), "dd-MMM-yyyy")} className="text-right" sortable />
                  <Column field="voucherNo" header="Reference" className="text-center" sortable />
                  <Column field="dailyVoucher" header="PCV No" className="text-left" sortable />
                  <Column field="expenseDescription" header="Description" className="text-left" sortable />
                  <Column field="amount" header="Amount" body={(d) => Number(d.amount).toLocaleString('en-US', {
                    style: 'decimal', minimumFractionDigits: 2
                  })} className="text-end" />
                  <Column field="status" header="Status" className="text-center" body={statusBodyTemplate} sortable />
                  <Column header="Action" className="text-center" body={actionBodyTemplate} />
                </DataTable>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Modal isOpen={isModalOpen} toggle={() => setIsModalOpen(false)} centered>
          <ModalHeader toggle={() => setIsModalOpen(false)}>Confirm Action</ModalHeader>
          <ModalBody className="py-3 px-5 text-center">
            <i className="mdi mdi-alert-circle-outline" style={{ fontSize: "6em", color: "orange" }} />
            <h4>Do you want to continue?</h4>
            <div className="mt-3 d-flex justify-content-center gap-3">
              <Button color="success" size="lg" onClick={() => setIsModalOpen(false)}>Yes</Button>
              <Button color="danger" size="lg" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            </div>
          </ModalBody>
        </Modal>


      </Container>
    </div >
  );
};

export default ManageExpense;