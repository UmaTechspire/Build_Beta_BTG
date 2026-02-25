import React, { useState } from "react";
import {
    Card,
    CardBody,
    Col,
    Container,
    Row,
    Button,
    FormGroup,
    Label,
    Input,
    Table,
} from "reactstrap";

const Breadcrumbs = ({ title, breadcrumbItem }) => (
    <div className="page-title-box  d-sm-flex align-items-center justify-content-between">
        <h4 className="mb-sm-0 font-size-18">{breadcrumbItem}</h4>
        <div className="page-title-right">
            <ol className="breadcrumb m-0">
                <li className="breadcrumb-item"><a href="/#">{title}</a></li>
                <li className="breadcrumb-item active"><a href="/#">{breadcrumbItem}</a></li>
            </ol>
        </div>
    </div>
);

const BankMaster = () => {
    const [formData, setFormData] = useState({
        systemNumber: "",
        bankAccountType: "",
        ifsc: "",
        bankName: "",
        accountNumber: "",
        branch: "",
        address: "",
        overdraftLimit: "",
    });

    const [bankList, setBankList] = useState([]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAdd = () => {
        if (!formData.bankName || !formData.accountNumber) return;
        const newEntry = {
            id: Date.now(),
            systemNumber: formData.systemNumber || `BANK-${bankList.length + 1}`,
            bankAccountType: formData.bankAccountType,
            ifsc: formData.ifsc,
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            branch: formData.branch,
            address: formData.address,
            overdraftLimit: formData.overdraftLimit ? parseFloat(formData.overdraftLimit) : 0,
            isActive: true,
            createdBy: "Admin",
            createdDate: new Date().toLocaleDateString(),
            modifiedBy: "Admin",
            modifiedDate: new Date().toLocaleDateString(),
        };
        setBankList([...bankList, newEntry]);
        setFormData({
            systemNumber: "",
            bankAccountType: "",
            ifsc: "",
            bankName: "",
            accountNumber: "",
            branch: "",
            address: "",
            overdraftLimit: "",
        });
    };

    const toggleActive = (id) => {
        setBankList(
            bankList.map((item) =>
                item.id === id ? { ...item, isActive: !item.isActive } : item
            )
        );
    };

    return (
        <React.Fragment>
            <div className="sidebar">&nbsp;</div>
            <div className="page-content">
                <Container fluid>
                    <Breadcrumbs title="Masters" breadcrumbItem="Bank" />
                    <Row>
                        <Col lg="12">
                            <Card>
                                <CardBody>
                                    {/* Form Section */}
                                    <Row className="mb-3">
                                        <Col md="3">
                                            <FormGroup>
                                                <Label>System Generated Number</Label>
                                                <Input
                                                    type="text"
                                                    name="systemNumber"
                                                    value={formData.systemNumber}
                                                    onChange={handleChange}
                                                    placeholder="000SER001"
                                                />
                                            </FormGroup>
                                        </Col>
                                        <Col md="3">
                                            <FormGroup>
                                                <Label>Bank Name</Label>
                                                <Input
                                                    type="select"
                                                    name="bankName"
                                                    value={formData.bankName}
                                                    onChange={handleChange}
                                                >
                                                    <option value="">-- Select Bank --</option>
                                                    <option value="SBI">State Bank of India (SBI)</option>
                                                    <option value="HDFC">HDFC Bank</option>
                                                    <option value="ICICI">ICICI Bank</option>
                                                    <option value="Axis">Axis Bank</option>
                                                    <option value="PNB">Punjab National Bank</option>
                                                </Input>
                                            </FormGroup>

                                        </Col>
                                        <Col md="3">
                                            <FormGroup>
                                                <Label>Bank Account Type</Label>
                                                <Input
                                                    type="select"
                                                    name="bankAccountType"
                                                    value={formData.bankAccountType}
                                                    onChange={handleChange}
                                                >
                                                    <option value="">-- Select Account Type --</option>
                                                    <option value="Savings">Savings</option>
                                                    <option value="Current">Current</option>
                                                </Input>
                                            </FormGroup>

                                        </Col>
                                        <Col md="3">
                                            <FormGroup>
                                                <Label>IFSC</Label>
                                                <Input
                                                    type="text"
                                                    name="ifsc"
                                                    value={formData.ifsc}
                                                    onChange={handleChange}
                                                    placeholder="Enter IFSC Code"
                                                />
                                            </FormGroup>
                                        </Col>


                                        <Col md="3">
                                            <FormGroup>
                                                <Label>Bank Account Number</Label>
                                                <Input
                                                    type="text"
                                                    name="accountNumber"
                                                    value={formData.accountNumber}
                                                    onChange={handleChange}
                                                    placeholder="Enter Account Number"
                                                />
                                            </FormGroup>
                                        </Col>
                                        <Col md="3">
                                            <FormGroup>
                                                <Label>Branch</Label>
                                                <Input
                                                    type="text"
                                                    name="branch"
                                                    value={formData.branch}
                                                    onChange={handleChange}
                                                    placeholder="Enter Branch"
                                                />
                                            </FormGroup>
                                        </Col>

                                        <Col md="6">
                                            <FormGroup>
                                                <Label>Address</Label>
                                                <Input
                                                    type="textarea"
                                                    name="address"
                                                    rows="1"
                                                    value={formData.address}
                                                    onChange={handleChange}
                                                    placeholder="Enter Bank Address"
                                                />
                                            </FormGroup>
                                        </Col>
                                        <Col md="6">
                                            <FormGroup>
                                                <Label>Overdraft Limit</Label>
                                                <Input
                                                    type="number"
                                                    name="overdraftLimit"
                                                    value={formData.overdraftLimit}
                                                    onChange={handleChange}
                                                    placeholder="Enter Credit Facility Limit (0 if None)"
                                                    min="0"
                                                />
                                            </FormGroup>
                                        </Col>
                                    </Row>

                                    <Button color="primary" onClick={handleAdd}>
                                        Add Bank
                                    </Button>


                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default BankMaster;