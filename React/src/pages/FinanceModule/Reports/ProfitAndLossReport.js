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

const ProfitAndLossReport = () => {
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errormsg, setErrormsg] = useState("");
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const fetchProfitAndLossData = async () => {
        setLoading(true);
        setErrormsg("");
        try {
            const response = await axios.get(
                `${PYTHON_API_URL}/AR/reports/comparative-p-and-l?year=${selectedYear}`
            );
            if (response.data?.status === "success") {
                setReportData(response.data.data || []);
            } else {
                setErrormsg("Failed to load Profit and Loss data.");
            }
        } catch (error) {
            console.error("Error fetching P&L data:", error);
            setErrormsg("Error loading report data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfitAndLossData();
    }, [selectedYear]);

    const numBody = (val) =>
        val ? val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";

    const rowClassName = (data) => {
        if (data.isHeader) return "bg-light font-weight-bold text-primary";
        if (data.isTotal) return "bg-soft-success font-weight-bold";
        return "";
    };

    const monthColumns = [
        { field: "month_1", header: "Jan" },
        { field: "month_2", header: "Feb" },
        { field: "month_3", header: "Mar" },
        { field: "month_4", header: "Apr" },
        { field: "month_5", header: "May" },
        { field: "month_6", header: "Jun" },
        { field: "month_7", header: "Jul" },
        { field: "month_8", header: "Aug" },
        { field: "month_9", header: "Sep" },
        { field: "month_10", header: "Oct" },
        { field: "month_11", header: "Nov" },
        { field: "month_12", header: "Dec" },
    ];

    const particularBody = (rowData) => {
        return (
            <span style={{ paddingLeft: `${rowData.level * 20}px` }}>
                {rowData.accountName}
            </span>
        );
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <Breadcrumbs title="Reports" breadcrumbItem="Profit & Loss Account (Comparative)" />
                    <Row>
                        {errormsg && (
                            <UncontrolledAlert color="danger">{errormsg}</UncontrolledAlert>
                        )}

                        <Card className="search-top mb-2">
                            <CardBody className="p-2">
                                <Row className="align-items-center g-3 justify-content-start">
                                    <Col lg="auto">
                                        <div className="d-flex align-items-center gap-2">
                                            <Label className="mb-0">Year</Label>
                                            <select
                                                className="form-select"
                                                value={selectedYear}
                                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                                style={{ width: "120px" }}
                                            >
                                                {[2023, 2024, 2025, 2026].map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </Col>
                                    <Col lg="auto">
                                        <button
                                            className="btn btn-primary"
                                            onClick={fetchProfitAndLossData}
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
                                        rows={50}
                                        className="p-datatable-sm"
                                        dataKey="id"
                                        responsiveLayout="scroll"
                                        rowClassName={rowClassName}
                                        scrollable
                                        scrollHeight="600px"
                                        emptyMessage="No data found for the selected year."
                                    >
                                        <Column
                                            field="accountName"
                                            header="Particulars"
                                            body={particularBody}
                                            frozen
                                            style={{ backgroundColor: "#f8f9fa", width: '250px', fontWeight: '500' }}
                                        />
                                        {monthColumns.map(col => (
                                            <Column
                                                key={col.field}
                                                field={col.field}
                                                header={col.header}
                                                body={(r) => r.isHeader ? "" : numBody(r[col.field])}
                                                className="text-end"
                                                style={{ minWidth: "120px" }}
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

export default ProfitAndLossReport;
