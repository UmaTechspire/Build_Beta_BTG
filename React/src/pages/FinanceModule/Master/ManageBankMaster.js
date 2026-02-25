import React, { useState, useEffect } from "react";
import { Card, CardBody, Col, Container, Row, Button } from "reactstrap";
import Select from "react-select";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useHistory } from "react-router-dom";

import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "primereact/resources/primereact.min.css";

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

const ManageBankMaster = () => {
  const history = useHistory();

  // Sample Data
  const [bankList, setBankList] = useState([
    {
      id: 1,
      systemNumber: "BANK-001",
      bankAccountType: "Savings",
      ifsc: "HDFC0001234",
      bankName: "HDFC Bank",
      accountNumber: "1234567890",
      branch: "Main Branch",
      address: "Mumbai",
      isActive: true,
      createdBy: "Admin",
      createdDate: "2025-09-01",
      modifiedBy: "Admin",
      modifiedDate: "2025-09-05",
      overdraftLimit: 7000000000,
    },
    {
      id: 2,
      systemNumber: "BANK-002",
      bankAccountType: "Current",
      ifsc: "ICIC0005678",
      bankName: "ICICI Bank",
      accountNumber: "0987654321",
      branch: "Andheri",
      address: "Mumbai",
      isActive: false,
      createdBy: "Admin",
      createdDate: "2025-08-20",
      modifiedBy: "Admin",
      modifiedDate: "2025-09-03",
      overdraftLimit: 0,
    },
  ]);

  const [filters, setFilters] = useState({ global: { value: null, matchMode: FilterMatchMode.CONTAINS } });
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  // Column filter
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [selectedValue, setSelectedValue] = useState(null);
  const [valueOptions, setValueOptions] = useState([]);

  const columnOptions = [
    { value: "bankAccountType", label: "Bank Account Type" },
    { value: "bankName", label: "Bank Name" },
    { value: "isActive", label: "Is Active" },
  ];

  useEffect(() => {
    if (selectedColumn) {
      const uniqueValues = [...new Set(bankList.map(a => a[selectedColumn.value]))];
      setValueOptions(uniqueValues.map(v => ({ value: v, label: v.toString() })));
      setSelectedValue(null);
    } else {
      setValueOptions([]);
    }
  }, [selectedColumn, bankList]);

  const applyColumnFilter = (column, value) => {
    if (column && value) {
      setFilters({
        ...filters,
        [column.value]: { value: value.value, matchMode: FilterMatchMode.EQUALS },
      });
    }
  };

  const clearColumnFilter = () => {
    setFilters({ global: { value: null, matchMode: FilterMatchMode.CONTAINS } });
    setSelectedColumn(null);
    setSelectedValue(null);
    setGlobalFilterValue("");
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    setFilters({ ...filters, global: { value, matchMode: FilterMatchMode.CONTAINS } });
    setGlobalFilterValue(value);
  };

  const toggleActive = (id) => {
    setBankList(bankList.map(item =>
      item.id === id ? { ...item, isActive: !item.isActive } : item
    ));
  };

  const exportToExcel = () => {
    const exportData = bankList.map(a => ({
      "System Generated Number": a.systemNumber,
      "Bank Account Type": a.bankAccountType,
      "IFSC": a.ifsc,
      "Bank Name": a.bankName,
      "Account Number": a.accountNumber,
      "Branch": a.branch,
      "Address": a.address,
      "Overdraft Limit": a.overdraftLimit ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(a.overdraftLimit) : "Rp 0,00",
      "Is Active": a.isActive ? "Yes" : "No",
      "Created By / Date": `${a.createdBy} / ${a.createdDate}`,
      "Modified By / Date": `${a.modifiedBy} / ${a.modifiedDate}`,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BankMaster");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `BankMaster-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const statusBodyTemplate = (rowData) => (rowData.isActive ? "Yes" : "No");

  const actionBodyTemplate = (rowData) => (
    <div className="d-flex gap-2 justify-content-center">
      <Button color="warning" style={{ width: "50px" }}>Edit</Button>
      <Button style={{ width: "80px" }} color={rowData.isActive ? "danger" : "success"} onClick={() => toggleActive(rowData.id)}>
        {rowData.isActive ? "Inactive" : "Activate"}
      </Button>
    </div>
  );

  const renderHeader = () => (
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <Button color="danger" onClick={clearColumnFilter}>Clear</Button>
      <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Global Search" />
    </div>
  );

  const header = renderHeader();

  const addNewBank = () => {
    history.push("/BankMaster");
  };

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Masters" breadcrumbItem="Bank" />

          <Row className="pt-2 pb-3">
            <Col md="3">
              <Select
                placeholder="Select Column"
                value={selectedColumn}
                onChange={setSelectedColumn}
                options={columnOptions}
                isClearable
              />
            </Col>
            <Col md="3">
              <Select
                placeholder="Select Value"
                value={selectedValue}
                onChange={(val) => {
                  setSelectedValue(val);
                  applyColumnFilter(selectedColumn, val);
                }}
                options={valueOptions}
                isClearable
                isDisabled={!selectedColumn}
              />
            </Col>
            <Col md="6" className="text-end">
              <Button color="info" className="me-2" onClick={addNewBank}>New</Button>
              <Button color="secondary" className="me-2" onClick={exportToExcel}>Export</Button>
              <Button color="danger" onClick={clearColumnFilter}>Cancel</Button>
            </Col>
          </Row>

          <Row>
            <Col lg="12">
              <Card>
                <CardBody>
                  <DataTable
                    value={bankList}
                    paginator
                    rows={5}
                    dataKey="id"
                    filters={filters}
                    globalFilterFields={["systemNumber", "bankName", "bankAccountType"]}
                    header={header}
                    emptyMessage="No Bank records found."
                    showGridlines
                  >
                    <Column header="S.No." body={(_, { rowIndex }) => rowIndex + 1} />
                    <Column field="systemNumber" header="System Generated Number" sortable />
                    <Column field="bankAccountType" header="Bank Account Type" sortable />
                    <Column field="ifsc" header="IFSC" sortable />
                    <Column field="bankName" header="Bank Name" sortable />
                    <Column field="accountNumber" header="Account Number" sortable />
                    <Column field="branch" header="Branch" sortable />
                    <Column field="address" header="Address" sortable />
                    <Column field="overdraftLimit" header="Overdraft Limit" body={(rowData) => rowData.overdraftLimit ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(rowData.overdraftLimit) : "Rp 0,00"} sortable />
                    <Column field="isActive" header="IsActive" body={statusBodyTemplate} sortable />
                    <Column field="createdBy" header="Created By / Date" body={(row) => `${row.createdBy} / ${row.createdDate}`} />
                    <Column field="modifiedBy" header="Modified By / Date" body={(row) => `${row.modifiedBy} / ${row.modifiedDate}`} />
                    <Column header="Actions" body={actionBodyTemplate} />
                  </DataTable>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default ManageBankMaster;