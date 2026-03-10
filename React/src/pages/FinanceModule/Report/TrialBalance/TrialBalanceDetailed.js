import React, { useState, useReducer, useMemo } from 'react';
import { Container, Row, Col, Card, CardBody, Collapse, Button } from "reactstrap";
import Breadcrumbs from "../../../../components/Common/Breadcrumb";
import TrialBalanceRow from './TrialBalanceRow';
import { calculateClosingBalances, calculateTotals } from './utils';
import { isBalanced, formatCurrency } from './validation';

// Use a simple ID generator since crypto.randomUUID might not be polyfilled in older environments 
// or simpler to just use Date.now() + random
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const createEmptyRow = () => ({
    id: generateId(),
    accountCode: '',
    accountName: '',
    openingDebit: 0,
    openingCredit: 0,
    debitTransactions: 0,
    creditTransactions: 0,
    closingDebit: 0,
    closingCredit: 0,
});

const reducer = (state, action) => {
    switch (action.type) {
        case 'ADD_ROW':
            return [...state, createEmptyRow()];

        case 'DELETE_ROW':
            // Prevent deleting the very last row to maintain an empty state
            if (state.length === 1) return [createEmptyRow()];
            return state.filter(row => row.id !== action.payload);

        case 'UPDATE_FIELD': {
            let updatedRowIndex = state.findIndex((row) => row.id === action.payload.id);
            if (updatedRowIndex === -1) return state;

            const row = state[updatedRowIndex];
            const updatedRow = { ...row, [action.payload.field]: action.payload.value };

            // Handle Mutually Exclusive Opening Balances (Rule 2.1)
            if (action.payload.field === 'openingDebit' && action.payload.value > 0) {
                updatedRow.openingCredit = 0;
            }
            if (action.payload.field === 'openingCredit' && action.payload.value > 0) {
                updatedRow.openingDebit = 0;
            }

            // Recalculate Closing Balances instantly (Rule 2.3)
            const balances = calculateClosingBalances(
                updatedRow.openingDebit,
                updatedRow.openingCredit,
                updatedRow.debitTransactions,
                updatedRow.creditTransactions
            );

            updatedRow.closingDebit = balances.closingDebit;
            updatedRow.closingCredit = balances.closingCredit;

            const newState = [...state];
            newState[updatedRowIndex] = updatedRow;
            return newState;
        }

        default:
            return state;
    }
};

const TrialBalanceDetailed = () => {
    const [rows, dispatch] = useReducer(reducer, [createEmptyRow()]);
    const [activeAccord, setActiveAccord] = useState({ col1: true });

    const showAccord = activeItem => {
        setActiveAccord(prevState => ({
            ...prevState,
            [activeItem]: !prevState[activeItem],
        }));
    };

    // Totals computed using useMemo so it only fires when `rows` actually change
    const totals = useMemo(() => calculateTotals(rows), [rows]);

    const balanced = isBalanced(totals.closingDebit, totals.closingCredit);
    const hasData = totals.closingDebit > 0 || totals.closingCredit > 0;

    const thStyle = {
        position: 'sticky', top: 0, zIndex: 10,
        textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap'
    };

    return (
        <div className="page-content">
            <Container fluid>
                <Breadcrumbs title="Reports" breadcrumbItem="Trial Balance (Detailed)" />

                <Row>
                    <Col lg="12">
                        <div className="d-flex justify-content-end mb-3 button-items">
                            <Button color="success" disabled={!balanced || !hasData}>
                                <i className="bx bxs-save me-2"></i> Save Trial Balance
                            </Button>
                            <Button color="success" disabled={!balanced || !hasData}>
                                <i className="bx bxs-check-shield me-2"></i> Post Trial Balance
                            </Button>
                            <Button color="secondary" onClick={() => window.history.back()}>
                                <i className="bx bx-window-close me-2 border-danger" /> Cancel
                            </Button>
                        </div>
                    </Col>
                </Row>

                <Row>
                    <Col lg="12">
                        <Card>
                            <CardBody>
                                {(!balanced && hasData) && (
                                    <div className="alert alert-danger fw-bold">
                                        ⚠️ Trial Balance is not balanced. (Difference: {formatCurrency(Math.abs(totals.closingDebit - totals.closingCredit))})
                                    </div>
                                )}

                                <Row>
                                    <Col lg="12">
                                        <div className="accordion accordion-flush" id="accordionFlushExample">
                                            <div className="accordion-item">
                                                <h2 className="accordion-header" id="headingFlushTwo" style={{ backgroundColor: "#cee3f8" }}>
                                                    <button className={`accordion-button fw-medium ${!activeAccord.col1 ? "collapsed" : ""}`} type="button" onClick={() => showAccord("col1")} style={{ cursor: "pointer" }}>
                                                        {" "} TRIAL BALANCE DETAILS {" "}
                                                    </button>
                                                </h2>
                                                <Collapse isOpen={activeAccord.col1} className="accordion-collapse">
                                                    <div className="accordion-body">
                                                        <div className="table-responsive tab-wid table-height">
                                                            <table className="table mb-0">
                                                                <thead style={{ backgroundColor: "#3e90e2", color: "white" }}>
                                                                    <tr>
                                                                        <th className="text-center align-middle" rowSpan={2} style={{ width: "2%" }}>
                                                                            <span style={{ cursor: "pointer", alignItems: "center" }} onClick={() => dispatch({ type: 'ADD_ROW' })}>
                                                                                <i className="mdi mdi-plus fs-5" />
                                                                            </span>
                                                                        </th>
                                                                        <th className="text-center align-middle" rowSpan={2} style={{ width: "10%" }}>Account Code</th>
                                                                        <th className="text-center align-middle" rowSpan={2} style={{ width: "18%" }}>Account Name</th>
                                                                        <th className="text-center" colSpan={2}>Opening Balance</th>
                                                                        <th className="text-center" colSpan={2}>Transactions</th>
                                                                        <th className="text-center" colSpan={2}>Closing Balance</th>
                                                                        <th className="text-center align-middle" rowSpan={2} style={{ width: "2%" }}>Act</th>
                                                                    </tr>
                                                                    <tr>
                                                                        <th className="text-center">Debit</th>
                                                                        <th className="text-center">Credit</th>
                                                                        <th className="text-center">Debit</th>
                                                                        <th className="text-center">Credit</th>
                                                                        <th className="text-center">Debit</th>
                                                                        <th className="text-center">Credit</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {rows.map((row, index) => (
                                                                        <TrialBalanceRow key={row.id} row={row} index={index} dispatch={dispatch} />
                                                                    ))}
                                                                </tbody>
                                                                <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                                                                    <tr className="table-light fw-bold">
                                                                        <td colSpan={3} className="text-end p-2">TOTAL:</td>
                                                                        <td className="text-end p-2">{formatCurrency(totals.openingDebit)}</td>
                                                                        <td className="text-end p-2">{formatCurrency(totals.openingCredit)}</td>
                                                                        <td className="text-end p-2">{formatCurrency(totals.debitTransactions)}</td>
                                                                        <td className="text-end p-2">{formatCurrency(totals.creditTransactions)}</td>
                                                                        <td className={`text-end p-2 ${!balanced ? 'text-danger' : ''}`}>
                                                                            {formatCurrency(totals.closingDebit)}
                                                                        </td>
                                                                        <td className={`text-end p-2 ${!balanced ? 'text-danger' : ''}`}>
                                                                            {formatCurrency(totals.closingCredit)}
                                                                        </td>
                                                                        <td></td>
                                                                    </tr>
                                                                </tfoot>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </Collapse>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default TrialBalanceDetailed;