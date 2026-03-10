import React, { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Col,
  Container,
  Row,
  UncontrolledAlert,
  Label,
} from "reactstrap";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import Breadcrumbs from "../../../components/Common/Breadcrumb";
import axios from "axios";
import { PYTHON_API_URL } from "../../../common/pyapiconfig";

const BalanceSheetReport = () => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errormsg, setErrormsg] = useState("");

  const currentYear = new Date().getFullYear();
  const [baseYear, setBaseYear] = useState(currentYear);
  const [compareYear, setCompareYear] = useState(currentYear - 1);
  const [isComparing, setIsComparing] = useState(false);

  const fetchBalanceSheetData = async () => {
    setLoading(true);
    setErrormsg("");
    try {
      const yearsParam = isComparing ? `${baseYear},${compareYear}` : `${baseYear}`;
      const response = await axios.get(
        `${PYTHON_API_URL}/AR/reports/comparative-balance-sheet?years=${yearsParam}`
      );
      if (response.data?.status === "success") {
        setReportData(response.data.data || []);
      } else {
        setErrormsg("Failed to load Balance Sheet data.");
      }
    } catch (error) {
      console.error("Error fetching Balance Sheet data:", error);
      setErrormsg("Error loading report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceSheetData();
  }, [baseYear, isComparing]);

  const numBody = (val) =>
    val !== null && val !== undefined ? val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";

  const rowClassName = (data) => {
    if (data.isHeader) return "bg-light font-weight-bold text-primary";
    if (data.isTotal) return "bg-soft-primary font-weight-bold";
    return "";
  };

  const particularBody = (rowData) => {
    return (
      <span style={{ paddingLeft: `${rowData.level * 20}px` }}>
        {rowData.accountName}
      </span>
    );
  };

  const displayedYears = isComparing ? [baseYear, compareYear] : [baseYear];
  const yearOptions = [2023, 2024, 2025, 2026];

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Reports" breadcrumbItem="Balance Sheet (Comparative)" />
          <Row>
            {errormsg && (
              <UncontrolledAlert color="danger">{errormsg}</UncontrolledAlert>
            )}

            <Card className="search-top mb-2">
              <CardBody className="p-2">
                <Row className="align-items-center g-3 justify-content-start">
                  <Col lg="auto">
                    <div className="d-flex align-items-center gap-2">
                      <Label className="mb-0 text-nowrap">Year</Label>
                      <select
                        className="form-select"
                        value={baseYear}
                        onChange={(e) => setBaseYear(parseInt(e.target.value))}
                        style={{ width: "100px" }}
                      >
                        {yearOptions.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </Col>

                  {isComparing && (
                    <Col lg="auto">
                      <div className="d-flex align-items-center gap-2">
                        <Label className="mb-0 text-nowrap">Compare with</Label>
                        <select
                          className="form-select"
                          value={compareYear}
                          onChange={(e) => setCompareYear(parseInt(e.target.value))}
                          style={{ width: "100px" }}
                        >
                          {yearOptions.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </Col>
                  )}

                  <Col lg="auto">
                    <button
                      className={`btn ${isComparing ? 'btn-warning' : 'btn-info'}`}
                      onClick={() => setIsComparing(!isComparing)}
                    >
                      <i className={`bx ${isComparing ? 'bx-x' : 'bx-git-compare'} me-1`}></i>
                      {isComparing ? "Cancel Compare" : "Compare"}
                    </button>
                  </Col>

                  <Col lg="auto">
                    <button
                      className="btn btn-primary"
                      onClick={fetchBalanceSheetData}
                    >
                      <i className="bx bx-search-alt me-1"></i>Search
                    </button>
                  </Col>
                </Row>
              </CardBody>
            </Card>

            <Col lg="12">
              <Card>
                <CardBody>
                  <DataTable
                    value={reportData}
                    loading={loading}
                    showGridlines
                    className="p-datatable-sm"
                    dataKey="id"
                    responsiveLayout="scroll"
                    rowClassName={rowClassName}
                    emptyMessage="No data found."
                  >
                    <Column
                      field="accountName"
                      header="Particulars"
                      body={particularBody}
                      style={{ width: '450px', fontWeight: '500' }}
                    />
                    {displayedYears.map(y => (
                      <Column
                        key={y}
                        field={`year_${y}`}
                        header={y}
                        body={(r) => r.isHeader ? "" : numBody(r[`year_${y}`])}
                        className="text-end"
                      />
                    ))}
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

export default BalanceSheetReport;
