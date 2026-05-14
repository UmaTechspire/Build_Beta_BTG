import React, { useState, useEffect, useRef } from "react";
import { useHistory, useParams } from "react-router-dom";
import {
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader
} from "reactstrap";
import { Button, Col, Card, CardBody, Container, FormGroup, Label, Row, TabContent, TabPane, NavItem, Table, Input, NavLink, InputGroup } from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import classnames from "classnames";
import { Formik, Field, Form, FieldArray } from "formik";
import * as Yup from "yup";
import "flatpickr/dist/themes/material_blue.css"
import Flatpickr from "react-flatpickr"
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { Editor } from "react-draft-wysiwyg";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import Select from "react-select";
import { AutoComplete } from "primereact/autocomplete";
import {
    GetClaimAndPaymentTransactionCurrency, GetCommonProcurementDeliveryTerms, GetCommonProcurementDepartmentDetails,
    GetCommonProcurementItemDetails, GetCommonProcurementPaymentTerms, GetCommonProcurementPRType, GetPurchaseMemoList, GetPrIdDetails,
    GetCommonProcurementPurchaseRequisitionSeqNo, GetCommonProcurementSupplierDetails, GetCommonProcurementUomDetails, PurchaseRequisitionDownloadFileById,
    GetPurchaseRequisitionUserDetails, SaveProcurementRequisition, UpdateProcurementRequisition, GetSupplierCurrency, GetByIdPurchaseRequisition, PurchaseRequisitionuploadFileToServer,
    GetPurchaseRequisitionItemDetails,
    GetCommonProcurementItemGroupDetails, GetCommonProcurementProjectsDetails,
    DownloadMemoFileById,
    DownloadPurchaseRequisitionFileById,
    GetPurchaseRequisitionSupplierList,
    GetSupplierTaxList, GetSupplierVATList, GetAllPO
} from "common/data/mastersapi";
import { roundByCurrency, roundIDR } from "common/currencyUtils";
import Swal from 'sweetalert2';
import { useLocation } from "react-router-dom";
import { head } from "lodash";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

const pmOptions = [
    { label: "NA", value: "NA" },
    { label: "100000", value: "100000" },
];

const deliveryAddressOptions = [
    { label: "BTG Chennai", value: "btg_chennai" },
    { label: "BTG Bangalore", value: "btg_bangalore" },
];

const getUserDetails = () => {
    if (localStorage.getItem("authUser")) {
        const obj = JSON.parse(localStorage.getItem("authUser"))
        return obj;
    }
}
const CopyPurchaseRequisition = () => {
    const [UserData, setUserData] = useState(null);
    const isFirstRender = useRef(true);

    const { id } = useParams();
    const location = useLocation();
    const reqDetailsFromState = location.state?.ReqDetails || null;
    const purchase_req_id = reqDetailsFromState?.PRId || 0;
    const isEditMode = false;
    const history = useHistory();
    const [activeTab, setActiveTab] = useState(1);
    const API_URL = process.env.REACT_APP_API_URL;
    const toggleTab = (tab) => {
        if (activeTab !== tab) {
            setActiveTab(tab);
        }
    };
    const [showPreview, setShowPreview] = useState(false);
    const [fileName, setFileName] = useState("");
    const [branchId, setBranchId] = useState(1);
    const [orgId, setOrgId] = useState(1);
    const [departmentSuggestions, setDepartmentSuggestions] = useState({});
    const [itemNameSuggestions, setItemNameSuggestions] = useState({});
    const [prTypes, setPrTypes] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [paymentTerms, setPaymentTerms] = useState([]);
    const [deliveryTerms, setDeliveryTerms] = useState([]);
    const [requestors, setRequestors] = useState([]);
    const [currency, setCurrency] = useState([]);
    const [memoNo, setMemoNo] = useState([]);
    const [uomOptions, setUomOptions] = useState([]);
    const [subTotal, setSubTotal] = useState("0.00");
    const [totalDiscount, setTotalDiscount] = useState("0.00");
    const [totalTax, setTotalTax] = useState("0.00");
    const [totalVAT, setTotalVAT] = useState("0.00");
    const [netTotal, setNetTotal] = useState("0.00");
    const [selected, setSelected] = useState([]);
    const [isMulti, setIsMulti] = useState(true);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [pr_number, setPR_Number] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [attachments, setAttachments] = useState([]); // existing + new files

    const toggleModal = () => setShowModal(!showModal);

    // Separate new files
    const newFiles = attachments.filter((att) => att.type === "new");
    const existingFiles = attachments.filter((att) => att.type === "existing");
    const [taxList, setTaxList] = useState([]);
    const [vatList, setVatList] = useState([]);
    const [poOptions, setPoOptions] = useState([]);
    const [loadingPOs, setLoadingPOs] = useState(false);
    useEffect(() => {
        const userData = getUserDetails();

        setUserData(userData);
        console.log("Login data : ", userData);
        const loadMasterData = async () => {
            try {
                const [
                    taxRes, vatRes
                ] = await Promise.all([
                    GetSupplierTaxList(orgId, branchId), GetSupplierVATList(orgId, branchId),
                ]);

                setTaxList(
                    (taxRes?.data || []).map(item => ({
                        label: item.taxname,
                        value: item.taxid,
                        taxperc: item.taxperc,
                        vatperc: item.vatperc,
                    }))
                );


                setVatList(
                    (vatRes?.data || []).map(item => ({
                        label: item.taxname,
                        value: item.taxid,
                        taxperc: item.taxperc,
                        vatperc: item.vatperc,
                    }))
                );

            } catch (error) {
                console.error("Failed to load master data:", error);
            }
        };

        loadMasterData();
    }, [orgId, branchId]);

    // useEffect(() => {
    //     const fetchData = async () => {
    //         if (reqDetailsFromState) {

    //             const data = await GetByIdPurchaseRequisition(globalprId, branchId, orgId);
    //             if (data?.status && data.data) {
    //                 const mappedValues = mapApiDataToForm(data.data);
    //                 setInitialValues(mappedValues);
    //             }
    //         } else if (reqDetailsFromState) {
    //             const mappedValues = mapApiDataToForm(reqDetailsFromState);
    //             setInitialValues(mappedValues);
    //         }
    //     };

    //     fetchData();
    // }, [, reqDetailsFromState]);
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            console.log("Data from previous page:", reqDetailsFromState);

            const fetchData = async () => {
                debugger;
                // if (
                //     reqDetailsFromState &&
                //         memoNo &&
                //         Array.isArray(memoNo) &&
                //     memoNo.length > 0 // checks not empty array
                // )

                if (
                    reqDetailsFromState &&
                    memoNo &&
                    Array.isArray(memoNo) &&
                    memoNo.length > 0 // checks not empty array
                ) {
                    const branchId = 1;
                    const orgId = 1;
                    const PrId = reqDetailsFromState?.PRId;
                    const data = await GetByIdPurchaseRequisition(PrId, branchId, orgId);

                    if (data?.status && data.data) {
                        const mappedValues = mapApiDataToForm(data.data, memoNo);
                        const existingFiles = data.data?.Attachment.map(file => ({
                            name: file.filename,
                            url: file.filepath ? `${file.filepath}/${file.filename}` : file.filename,
                            type: "existing",
                            prattachid: file.prattachid,
                            prid: file.prid,
                            filepath: file.filepath
                        }));
                        setAttachments(existingFiles);
                        setInitialValues(mappedValues);
                        setPreviewUrl(data.data.Header.AttachmentPath ?? null);
                        setFileName(data.data.Header.AttachmentName ?? null);
                    }
                }
            };

            fetchData();
        }, 3000); // delay by 3 seconds

        // Cleanup the timeout on unmount
        return () => clearTimeout(timeoutId);
    }, [reqDetailsFromState, memoNo]);


    const mapApiDataToForm = (apiData, memoOptions, prTypes, paymentTerms, deliveryTerms) => {
        const header = apiData?.Header || {};
        const details = apiData?.Details || [];
        return {
            prType: header.PRTypeId,
            projectId: header.projectId,
            prNo: pr_number || "",
            currency: {
                value: header.currencyid,
                label: header.currencycode,
            },
            supplier: {
                value: header.SupplierId,
                label: header.SupplierName,
            },
            paymentTerm: {
                value: header.PaymentTermId,
                label: header.PaymentTermName,
            },
            prDate: new Date(header.PRDate),
            address: header.SupplierAddress || "",
            deliveryTerm: {
                value: parseInt(header.DeliveryTermId, 10) || 0,
                label: header.DeliveryTerm || "",
            },
            requestor: {
                value: header.RequestorId,
                label: header.UserName,
            },
            name: header.UserName || "",
            deliveryAddress: header.BTGDeliveryAddress || "",
            contact: header.contact || "",
            email: header.Email || "",
            remarks: header.Remarks || "",
            // pm_remarks: header.Memoremarks || "",
            poReference: header?.poreference || "",
            po_ref_id: header?.poReferenceId || 0,
            subTotal: header?.HeaderSubTotal || 0.00,
            discountValue: header?.HeaderDiscountValue || 0.00,
            taxValue: header?.HeaderTaxValue || 0.00,
            vatValue: header?.HeaderVatValue || 0.00,
            netTotal: header?.HeaderNetValue || 0.00,
            memoNo: (() => {
                const hasZeroMemo = (details || []).some(d => d.MEMO_ID === 0);

                return hasZeroMemo ? [{ value: "NA", label: "NA" }] : [];
            })(),

            // items:[]
            // memoNo: (() => {
            //     const memoIds = [...new Set((details || []).map(d => d.MEMO_ID).filter(id => id !== 0))];

            //     if (memoIds.length > 0) {
            //         return memoIds.map(id => ({
            //         value: id,
            //         label: memoOptions.find(m => m.value === id)?.label || id.toString()
            //         }));
            //     }

            //     return [{ value: "NA", label: "NA" }];
            // })(),
            items: (details || []).filter(item => item.MEMO_ID === 0).map(item => ({
                itemGroupId: {
                    value: item.ItemGroupId,
                    label: item.groupname,
                },
                itemName: {
                    value: item.ItemId,
                    label: item.ItemName,
                },
                // department: {
                //     value: header.DeptId,
                //     label: item.DepartmentName,
                // },
                uom: {
                    value: item.UOM,
                    label: item.UOMName,
                },
                qty: item.Qty || 0,
                unitPrice: item.UnitPrice || 0,
                discount: item.DiscountValue || 0,
                // taxPercent: item.TaxPerc || 0,
                taxPercent: item.TaxPerc || 0,
                taxId: {
                    value: item.taxid,
                    label: item.taxname,
                },

                vatId: {
                    value: item.vatid,
                    label: item.vatname,
                },
                taxAmount: item.TaxValue || 0,
                amount: item.NetTotal || 0,
                vatPercent: item.vatPerc ?? 0,
                vatAmount: item.vatValue ?? 0,
                taxSign: item.taxcalctype === 0 ? '+' : '-',
                availableStock: "",
                memoNo: item.MEMO_ID !== 0
                    ? {
                        value: item.MEMO_ID,
                        label: memoOptions.find(m => m.value === item.MEMO_ID)?.label || ""
                    }
                    : { value: "NA", label: "NA" },
                prdId: parseInt(item.PRDId) || 0,
            }))
        };
    };

    const [initialValues, setInitialValues] = useState({
        prType: "",
        prNo: "",
        memoNo: [],
        currency: null,
        supplier: null,
        paymentTerm: "",
        prDate: new Date(),
        address: "",
        deliveryTerm: "",
        requestor: null,
        projectId: 0,
        name: "",
        deliveryAddress: "",
        contact: "",
        email: "",
        remarks: "",
        pm_remarks: "",
        subTotal: 0.00,
        discountValue: 0.00,
        taxValue: 0.00,
        vatValue: 0.00,
        netTotal: 0.00,
        poReference: "",
        po_ref_id: 0,
        items: [
            {
                itemGroupId: null,
                itemName: null,
                department: null,
                uom: "",
                qty: "",
                unitPrice: '',
                discount: '',
                taxId: 0,
                vatId: 0,
                taxPercent: 0,
                taxAmount: 0,
                vatPercent: 0,
                vatAmount: 0,
                amount: 0,
                availableStock: "",
                prdId: "",
                taxSign: "-",
            }
        ]
    });

    const validationSchema = Yup.object().shape({
        prType: Yup.number().nullable().required("PR Type is required"),
        prNo: Yup.string().required("PR No. is required"),
        memoNo: Yup.array()
            .of(
                Yup.object().shape({
                    value: Yup.mixed().required(),
                    label: Yup.string().required()
                })
            )
            .min(1, "PM No. is required")      // <-- at least one entry
            .required("PM No. is required"),
        // poReference: Yup.string()
        //     .matches(/^[a-zA-Z0-9]*$/, "PO Reference must be alphanumeric")
        //     .when('prType', {
        //         is: (val) => val === 3 || val === 5, // Only required for 3 or 5
        //         then: Yup.string()
        //             .required("PO Reference is required")
        //             .matches(/^[a-zA-Z0-9]+$/, "PO Reference must be alphanumeric"),
        //         otherwise: Yup.string().nullable()
        //     }),
        supplier: Yup.object().nullable().required("Supplier is required"),
        currency: Yup.object()
            .nullable()
            .required("Currency is required"),
        paymentTerm: Yup.object().nullable().required("Payment Term is required"),
        prDate: Yup.date().required("PR Date is required"),
        // address: Yup.string().required("Supplier Address is required"),
        deliveryTerm: Yup.object().nullable().required("Delivery Term is required"),
        requestor: Yup.object().nullable().required("Requestor is required"),
        // name: Yup.string().required("Supplier Name is required"),
        deliveryAddress: Yup.string().required("BTG Delivery Address is required"),
        contact: Yup.string().required("Supplier Contact is required"),
        // email: Yup.string()
        //     // .email("Enter a valid email")
        //     .required("Supplier Email is required"),
        remarks: Yup.string(),
        pm_remarks: Yup.string(),

        items: Yup.array()
            .of(
                Yup.object().shape({
                    itemGroupId: Yup.object()
                        .nullable()
                        .required("Item Group is required"),
                    itemName: Yup.object().nullable().required("Item Name is required"),

                    uom: Yup.object().nullable().required("UOM is required"),
                    qty: Yup.number()
                        .typeError("Qty must be a number")
                        .positive("Qty must be greater than 0")
                        .required("Qty is required"),
                    unitPrice: Yup.number()
                        .typeError("Unit Price must be a number")
                        .required("Unit Price is required"),
                    discount: Yup.number()
                        .typeError("Discount must be a number")
                        .nullable(),
                    taxId: Yup.object().nullable().required("Tax is required"),
                    vatId: Yup.object().nullable().required("Vat is required"),
                    taxPercent: Yup.number()
                        .typeError("Tax % must be a number")
                        .nullable(),
                    taxAmount: Yup.number()
                        .typeError("Tax Amount must be a number")
                        .nullable(),
                    amount: Yup.number()
                        .typeError("Amount must be a number")
                        .nullable(),
                    availableStock: Yup.mixed(), // optional, so kept as mixed
                })
            )
            .min(1, "At least one item is required"),
    });

    const fetchAllCommonData = async () => {
        try {
            const [prTypeRes, supplierRes, paymentTermsRes, deliveryTermsRes, userRes, uomRes, memoList, projectsList] = await Promise.all([
                GetCommonProcurementPRType(purchase_req_id, orgId, branchId, '%'),
                // GetCommonProcurementSupplierDetails(purchase_req_id, orgId, branchId, '%'),
                GetPurchaseRequisitionSupplierList(orgId, branchId, '%'),
                GetCommonProcurementPaymentTerms(purchase_req_id, orgId, branchId, '%'),
                GetCommonProcurementDeliveryTerms(purchase_req_id, orgId, branchId, '%'),
                GetPurchaseRequisitionUserDetails(orgId, branchId, '%'),
                GetCommonProcurementUomDetails(purchase_req_id, orgId, branchId, '%'),
                //GetClaimAndPaymentTransactionCurrency(purchase_req_id, branchId, orgId, '%'),setProjects
                GetPurchaseMemoList(0, branchId, orgId, '%'),
                GetCommonProcurementProjectsDetails(orgId, branchId, '%'),
            ]);

            if (prTypeRes.status) {
                const options = prTypeRes.data.map(item => ({
                    value: item.typeid,
                    label: item.typename
                }));
                setPrTypes(options);
            }

            if (supplierRes.status) {
                const options = supplierRes.data.map(item => ({
                    value: item.SupplierID,
                    label: item.SupplierName,
                    peymenttermid: item.peymenttermid,
                    deliverytermid: item.deliverytermid
                }));
                // Robust deduplication: trim, collapse spaces, and case-insensitive check
                const uniqueOptions = Array.from(
                    new Map(options.map(item => [item.label.trim().replace(/\s+/g, ' ').toUpperCase(), item])).values()
                );
                setSuppliers(uniqueOptions);
            }

            if (paymentTermsRes.status) {
                const options = paymentTermsRes.data.map(item => ({
                    value: item.PaymentTermsId,
                    label: item.PaymentTerms
                }));
                setPaymentTerms(options);
            }

            if (deliveryTermsRes.status) {
                const options = deliveryTermsRes.data.map(item => ({
                    value: item.incotermid,
                    label: item.incoterm
                }));
                setDeliveryTerms(options);
            }

            if (userRes.status) {
                setRequestors(userRes.data.map(item => ({
                    value: item.Id,
                    label: item.UserName
                })));
            }

            if (uomRes.status) {
                setUomOptions(uomRes.data.map(item => ({
                    value: item.uomid,
                    label: item.UOMName
                })));
            }

            if (memoList.status) {
                setMemoNo(memoList.data.map(item => ({
                    value: item.memo_id == 0 ? "NA" : item.memo_id,
                    label: item.pm_number,
                    remarks: item.Remarks
                })));
            }
            debugger;
            if (projectsList.status) {
                const options = projectsList.data.map(item => ({
                    value: item.value,
                    label: item.label
                }));
                setProjects(options);
            }

        } catch (err) {
            console.error("Error fetching procurement dropdowns", err);
        }

    };

    useEffect(() => {
        const fetchSeqNum = async () => {
            const res = await GetCommonProcurementPurchaseRequisitionSeqNo(orgId, branchId);
            if (res.status) {
                const data = res.data
                setPR_Number(data?.MEMONO)
                setInitialValues((prev) => ({
                    ...prev,
                    prNo: data?.MEMONO,
                }));
            }
            // } else {
            //     Swal.fire({
            //         icon: 'error',
            //         title: 'Failed to Load Sequence Number',
            //         text: res.message || 'Could not fetch Claim and Payment Seq No.',
            //     });

        };
        fetchSeqNum();
        fetchAllCommonData();
    }, []);

    const formatDate = (dateObj) => {
        const d = new Date(dateObj);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // const transformToApiPayload = (values, isSubmitted) => {
    //     const ipAddress = "";
    //     debugger
    //     return {
    //         header: {
    //             prId: purchase_req_id,
    //             pR_Number: values.prNo,
    //             prDate: formatDate(values.prDate),
    //             prTypeId: typeof values.prType === 'object'
    //                 ? values.prType?.value ?? 0
    //                 : Number(values.prType) || 0,
    //             prTypeName : values.prType?.label ?? "",
    //             PaymentTermName :values.paymentTerm?.label ?? 0,
    //             supplierId: values.supplier?.value ?? 0,
    //             requestorId: values.requestor?.value ?? 0,
    //             paymentTermId: values.paymentTerm?.value ?? 0,
    //             currencyid: values.currency?.value ?? 0,
    //             deliveryTerm: values.deliveryTerm?.label ?? "",
    //             btgDeliveryAddress: values.deliveryAddress ?? "",
    //             remarks: values.remarks || "",
    //             memoIds: values.memoNo?.map(m => m.value) ?? [],
    //             quotationFileName: "",
    //             quotationFilePath: "",
    //             fileUpdatedDate: formatDate(new Date()),
    //             isSubmitted: isSubmitted,
    //             userid: 1,
    //             createdIP: ipAddress,
    //             modifiedIP: ipAddress,
    //             isActive: 1,
    //             orgId: orgId,
    //             branchId: branchId
    //         },

    //         details: values.items.map((item, index) => {
    //             const qty = parseFloat(item.qty) || 0;
    //             const unitPrice = parseFloat(item.unitPrice) || 0;
    //             const discountPerc = parseFloat(item.discount) || 0;
    //             const taxPerc = parseFloat(item.taxPercent) || 0;

    //             const discountValue = (qty * unitPrice * discountPerc) / 100;
    //             const subTotal = qty * unitPrice - discountValue;
    //             const taxValue = (subTotal * taxPerc) / 100;
    //             const netTotal = subTotal + taxValue;

    //             return {
    //                 prdId: item.prdId || 0,  // Use items array here safely with optional chaining
    //                 prId: purchase_req_id,
    //                 memo_ID: item.memoNo?.value === "NA" ? 0 : item.memoNo?.value ?? 0,
    //                 memo_dtl_Id: item.memoNo?.detail_id ?? 0,
    //                 itemId: item.itemName?.value ?? 0,
    //                 uom: item.uom ?? 0,
    //                 qty,
    //                 unitPrice,
    //                 totalValue: qty * unitPrice,
    //                 taxPerc,
    //                 taxValue,
    //                 subTotal,
    //                 discountPerc,
    //                 discountValue,
    //                 netTotal,
    //                 isActive: 1,
    //                 userid: 1,
    //                 createdIP: ipAddress,
    //                 modifiedIP: ipAddress
    //             };
    //         })

    //     };
    // };

    // const transformToApiPayload = (values, isSubmitted) => {
    //     debugger
    //     const ipAddress = "";
    //     return {
    //         header: {
    //             prId: purchase_req_id,
    //             pR_Number: values.prNo,
    //             prDate: formatDate(values.prDate),
    //             prTypeId: values.prType?.value ?? 0,
    //             supplierId: values.supplier?.value ?? 0,
    //             requestorId: values.requestor?.value ?? 0,
    //             //deptId: values.items?[0]?.department?.departmentid : 0,            
    //             paymentTermId: values.paymentTerm?.value ?? 0,
    //             currencyid: values.currency?.value ?? 0,
    //             deliveryTerm: values.deliveryTerm?.label ?? "",
    //             btgDeliveryAddress: values.deliveryAddress ?? "",
    //             remarks: values.remarks || "",
    //             memoIds: values.memoNo?.map(m => m.value) ?? [],
    //             quotationFileName: "", // Add logic if needed
    //             quotationFilePath: "",
    //             fileUpdatedDate: formatDate(new Date()),
    //             isSubmitted: isSubmitted,
    //             userid: 1,
    //             createdIP: ipAddress,
    //             modifiedIP: ipAddress,
    //             isActive: 1,
    //             orgId: orgId,
    //             branchId: branchId

    //         },
    //         details: values.items.map((item, index) => {
    //             debugger

    //             const qty = parseFloat(item.qty) || 0;
    //             const unitPrice = parseFloat(item.unitPrice) || 0;
    //             const discountPerc = parseFloat(item.discount) || 0;
    //             const taxPerc = parseFloat(item.taxPercent) || 0;

    //             const discountValue = (qty * unitPrice * discountPerc) / 100;
    //             const subTotal = qty * unitPrice - discountValue;
    //             const taxValue = (subTotal * taxPerc) / 100;
    //             const netTotal = subTotal + taxValue;

    //             debugger
    //             return {
    //                 prdId: PRDId,
    //                 prId: purchase_req_id,
    //                 memo_ID: values.memoNo?.[index]?.value ?? 0,
    //                 memo_dtl_Id: item.memoNo?.[index]?.detail_id ?? 0,
    //                 itemId: item.itemName?.itemid ?? 0,
    //                 //deptId: item.department?.departmentid || 0,
    //                 uom: item.uom ?? 0,
    //                 qty,
    //                 unitPrice,
    //                 totalValue: qty * unitPrice,
    //                 taxPerc,
    //                 taxValue,
    //                 subTotal,
    //                 discountPerc,
    //                 discountValue,
    //                 netTotal,
    //                 isActive: 1,
    //                 userid: 1,
    //                 createdIP: ipAddress,
    //                 modifiedIP: ipAddress
    //             };
    //         })
    //     };
    // };
    const transformToApiPayload = (values, isSubmitted) => {
        const ipAddress = "";
        return {
            header: {
                prId: 0,
                pR_Number: values.prNo || "",
                prDate: formatDate(values.prDate),
                groupname: values.itemGroupId?.label,

                prTypeId: typeof values.prType === 'object'
                    ? values.prType?.value ?? 0
                    : Number(values.prType) || 0,
                prTypeName: prTypes.find(opt => opt.value === Number(values.prType))?.label,

                projectId: typeof values.projectId === 'object'
                    ? values.projectId?.projectId ?? 0
                    : Number(values.projectId) || 0,

                supplierId: values.supplier?.value ?? 0,
                requestorId: values.requestor?.value ?? 0,

                paymentTermId: values.paymentTerm?.value ?? 0,
                PaymentTermName: values.paymentTerm?.label ?? "",

                currencyid: values.currency?.value ?? 0,

                deliveryTerm: values.deliveryTerm?.label ?? "",
                deliveryTermId: values.deliveryTerm?.value ?? "",

                btgDeliveryAddress: values.deliveryAddress ?? "",
                remarks: values.remarks || "",
                memoremarks: values.pm_remarks || "",
                poreference: values.poReference || "",
                po_ref_id: values.po_ref_id || 0,

                memoIds: values.memoNo?.map(m => m.value) ?? [],

                quotationFileName: "",
                quotationFilePath: "",

                fileUpdatedDate: formatDate(new Date()),
                isSubmitted: isSubmitted,
                userid: UserData?.u_id,
                createdIP: ipAddress,
                modifiedIP: ipAddress,
                isActive: 1,
                orgId: orgId,
                branchId: branchId,
                deptId: 0,
                exchangerate: 0,
                subTotal: values?.subTotal ? parseFloat(values.subTotal).toFixed(2) : "0.00",
                discountValue: values?.discountValue ? parseFloat(values.discountValue).toFixed(2) : "0.00",
                taxValue: values?.taxValue ? parseFloat(values.taxValue).toFixed(2) : "0.00",
                vatValue: values?.vatValue ? parseFloat(values.vatValue).toFixed(2) : "0.00",
                netTotal: values?.netTotal ? parseFloat(values.netTotal).toFixed(2) : "0.00",
            },

            // details: values.items.map(item => {
            //     const qty = parseFloat(item.qty) || 0;
            //     const unitPrice = parseFloat(item.unitPrice) || 0;
            //     const discountValue = parseFloat(item.discount) || 0; // amount
            //     const lineAfterDiscount = qty * unitPrice - discountValue;
            //     const discountPerc = (discountValue / (qty * unitPrice)) * 100

            //     // Apply tax with sign
            //     const taxSign = item.taxSign === "-" ? 1 : 0; // 0 = add, 1 = subtract
            //     const signedTaxAmount = taxSign === 0
            //         ? (lineAfterDiscount * (parseFloat(item.taxPercent) || 0)) / 100
            //         : -(lineAfterDiscount * (parseFloat(item.taxPercent) || 0)) / 100;

            //     // VAT after tax
            //     const vatBase = lineAfterDiscount + signedTaxAmount;
            //     const vatValue = (vatBase * (parseFloat(item.vatPercent) || 0)) / 100;

            //     // Net total: after tax sign, then minus VAT
            //     const netTotal = vatBase - vatValue;

            //     return {
            //         prdId: item.prdId || 0,
            //         prId: purchase_req_id,
            //         memo_ID: item.memoNo?.value === "NA" ? 0 : item.memoNo?.value ?? 0,
            //         memo_dtl_Id: item.memoNo?.detail_id ?? 0,
            //         itemGroupId: item.itemGroupId?.value,
            //         itemId: item.itemName?.value ?? 0,
            //         uom: item.uom?.value ?? 0,
            //         qty,
            //         unitPrice,
            //         totalValue: qty * unitPrice,

            //         taxPerc: parseFloat(item.taxPercent) || 0,
            //         taxValue: parseFloat(Math.abs(signedTaxAmount).toFixed(2)) || 0,
            //         vatPerc: parseFloat(item.vatPercent) || 0,
            //         vatValue: parseFloat(Math.abs(vatValue).toFixed(2)) || 0,
            //         taxcalctype: taxSign, // 0 for "+", 1 for "-"

            //         subTotal: parseFloat(lineAfterDiscount.toFixed(2)) || 0,
            //         discountPerc: parseFloat(discountPerc.toFixed(2)) || 0,
            //         discountValue: parseFloat(discountValue.toFixed(2)) || 0,
            //         netTotal: parseFloat(netTotal.toFixed(2)) || 0,

            //         isActive: 1,
            //         userid: 1,
            //         createdIP: ipAddress,
            //         modifiedIP: ipAddress
            //     };
            // })
            details: values.items.map(item => {
                const qty = parseFloat(item.qty) || 0;
                const unitPrice = parseFloat(item.unitPrice) || 0;
                const discountValue = parseFloat(item.discount) || 0; // amount
                const lineAfterDiscount = qty * unitPrice - discountValue;
                const discountPerc = (discountValue / (qty * unitPrice)) * 100;

                // Apply tax with sign (standardizing as subtraction based on user request)
                const taxSign = item.taxSign === "-" ? 1 : 0; // 0 for "+", 1 for "-"
                const taxVal = (lineAfterDiscount * (parseFloat(item.taxPercent) || 0)) / 100;
                const vatVal = (lineAfterDiscount * (parseFloat(item.vatPercent) || 0)) / 100;

                // Apply rounding
                const roundedTaxValue = Math.round(taxVal);
                const roundedVatValue = Math.round(vatVal);
                const roundedSubTotal = Math.round(lineAfterDiscount);
                const roundedDiscountValue = discountValue === undefined || discountValue === null ? "0.00" : discountValue;

                // Net Total = Base - Discount - Tax + VAT
                const roundedNetTotal = Math.round(lineAfterDiscount - roundedTaxValue + roundedVatValue);
                const roundedDiscountPerc = parseFloat(discountPerc.toFixed(2)); // percentage can keep 2 decimals

                return {
                    prdId: item.prdId || 0,
                    prId: 0,
                    memo_ID: item.memoNo?.value === "NA" ? 0 : item.memoNo?.value ?? 0,
                    memo_dtl_Id: item.memoNo?.detail_id ?? 0,
                    itemGroupId: item.itemGroupId?.value,
                    itemId: item.itemName?.value ?? 0,
                    uom: item.uom?.value ?? 0,
                    qty,
                    unitPrice,
                    totalValue: parseFloat((qty * unitPrice)),
                    taxid: item.taxId?.value ?? 0,
                    vatid: item.vatId?.value ?? 0,
                    taxPerc: parseFloat(item.taxPercent) || 0,
                    taxValue: parseFloat(item.taxAmount) || 0,
                    vatPerc: parseFloat(item.vatPercent) || 0,
                    vatValue: parseFloat(item.vatAmount) || 0,
                    taxcalctype: taxSign, // 0 for "+", 1 for "-"

                    // subTotal: roundedSubTotal,
                    subTotal: parseFloat((qty * unitPrice)),
                    discountPerc: roundedDiscountPerc,
                    discountValue: roundedDiscountValue,
                    netTotal: parseFloat(item.amount) || 0,

                    isActive: 1,
                    userid: UserData?.u_id,
                    createdIP: ipAddress,
                    modifiedIP: ipAddress
                };
            })
        };
    };

    const handleSubmit = async (values, isSubmitted) => {
        let actionType = 'Save';

        if (isEditMode && !isSubmitted) {
            actionType = 'Update';
        } else if (isSubmitted) {
            actionType = 'Post';
        }

        const result = await Swal.fire({
            title: `Are you sure you want to ${actionType}?`,
            text: `This will ${actionType.toLowerCase()} the procurement requisition.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: `Yes, ${actionType}`,
            cancelButtonText: 'Cancel',
        });

        if (!result.isConfirmed) return;

        const payload = transformToApiPayload(values, isSubmitted);
        //  console.log('values > ',values);
        //  console.log('payload > ',payload);
        // return;

        try {
            if (Array.isArray(payload.details)) {
                payload.details = payload.details.map(item => ({
                    ...item,
                    memo_ID: isNaN(parseInt(item.memo_ID)) ? 0 : parseInt(item.memo_ID)
                }));
            }

            // console.log("Sanitized payload:", payload);
            // console.log("payload", payload);
            const res = await SaveProcurementRequisition(isEditMode, payload);

            if (res?.status === true) {
                const PRId = isEditMode ? purchase_req_id : res?.data;

                let fileUploadSuccess = true;

                // Filter new files only
                const newFilesToUpload = attachments
                    .filter((att) => att.type === "new")
                    .map((f) => f.file);
                console.log('newFilesToUpload > ', newFilesToUpload)

                // Upload new files if any and not in edit mode
                if (newFilesToUpload.length > 0) {
                    try {
                        fileUploadSuccess = await PurchaseRequisitionuploadFileToServer({
                            files: newFilesToUpload,
                            PRId,
                            branchId,
                            userId: UserData?.u_id,
                        });
                    } catch (error) {
                        console.error("File upload failed:", error);
                        fileUploadSuccess = false;
                    }
                }
                if (fileUploadSuccess) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: 'Data saved and file uploaded successfully!',
                    }).then((result) => {
                        if (result.isConfirmed) {
                            history.push('/Manageclaim&Payment');
                        }
                    });
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Partial Success',
                        text: 'Data saved, but file upload failed.',
                    });
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: res?.message || 'Something went wrong!',
                });
            }
            console.log("response", res);
            if (res?.status === true) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: res.message,

                });

                // Optional: Redirect after success
                history.push('/procurementspurchase-requisition');
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: res?.message || 'Something went wrong while saving the requisition.',
                });
            }

        } catch (err) {
            console.error("Save Error:", err);
            Swal.fire({
                icon: 'error',
                title: 'Exception',
                text: 'An unexpected error occurred while saving.',
            });
        }
    };

    const [supplierAddresses, setsupplierAddresses] = useState([
        { code: "CA001", name: "Sara", type: "Billing", suppliername: "Juli", address: "Test address" },
    ]);

    const [productpriceList, setProductpriceList] = useState([
        { GasCode: "CA001", Price: "10", Currency: "USD", FromDate: "20-JAN-2025", EndDate: "20-JAN-2026" },
    ]);

    const [customeraddressDetails, setCustomeraddressDetails] = useState([
        { code: "CA001", name: "Sara", scode: "SPA001", address: "Test Address" },
    ]);

    const handleRemoveItem = (index) => {
        const updatedDetails = supplierAddresses.filter((_, i) => i !== index);
        setsupplierAddresses(updatedDetails);
    };
    const handleCancel = () => {
        history.push('/procurementspurchase-requisition');
    };

    const markAllTouched = (obj) => {
        if (Array.isArray(obj)) {
            return obj.map((item) => markAllTouched(item));
        } else if (typeof obj === 'object' && obj !== null) {
            const touchedObj = {};
            for (const key in obj) {
                touchedObj[key] = markAllTouched(obj[key]);
            }
            return touchedObj;
        }
        return true;
    };

    const loadDepartmentSuggestions = async (e, index) => {
        const searchText = e.query;
        try {
            const res = await GetCommonProcurementDepartmentDetails(purchase_req_id, orgId, branchId, searchText);
            setDepartmentSuggestions(prev => ({
                ...prev,
                [index]: Array.isArray(res.data) ? res.data : []
            }));
        } catch (error) {
            console.error("Failed to load department suggestions", error);
            setDepartmentSuggestions(prev => ({ ...prev, [index]: [] }));
        }
    };

    const [itemOptions, setItemOptions] = useState([]);
    const [itemGroupOptions, setItemGroupOptions] = useState([]);

    const loadItemGroupOptions = async () => {
        const res = await GetCommonProcurementItemGroupDetails(purchase_req_id, orgId, branchId, '%');
        if (res.status) {
            const options = Array.isArray(res.data) ? res.data.map(x => ({
                label: x.groupname,
                value: x.groupid,
            })) : [];

            setItemGroupOptions(options);
        }
    };

    const loadItemNameOptions = async (itemGroupId, index) => {
        const res = await GetCommonProcurementItemDetails(purchase_req_id, orgId, branchId, "%", itemGroupId);
        const options = Array.isArray(res.data) ? res.data.map(x => ({
            label: x.itemname,
            value: x.itemid,
            stock: x.stock,
            uom: x.uom,
            taxperc: x.taxperc,
            vatPerc: x.vatPerc,
        })) : [];

        setItemOptions(prev => ({ ...prev, [index]: options }));
    };

    useEffect(() => {
        loadItemGroupOptions();
        // const fetchItems = async () => {
        //     try {
        //         const res = await GetCommonProcurementItemDetails(purchase_req_id, orgId, branchId, '%');
        //         if (res?.status) {
        //             const options = res.data.map(item => ({
        //                 value: item.itemid,
        //                 label: item.itemname,
        //                 stock: item.stockqty
        //             }));
        //             setItemOptions(options);
        //         }
        //     } catch (err) {
        //         console.error("Failed to load item options", err);
        //     }
        // };

        // fetchItems();
    }, [purchase_req_id, orgId, branchId]);


    // const calculateLineTotals = (item) => {
    //     const qty = parseFloat(item.qty) || 0;
    //     const unitPrice = parseFloat(item.unitPrice) || 0;
    //     const discount = parseFloat(item.discount) || 0;
    //     const taxPercent = parseFloat(item.taxPercent) || 0;

    //     const lineTotal = qty * unitPrice;
    //     const lineAfterDiscount = lineTotal - discount;
    //     const taxAmount = (lineAfterDiscount * taxPercent) / 100;
    //     const totalAmount = lineAfterDiscount + taxAmount;

    //     return {
    //         taxAmount: taxAmount.toFixed(2),
    //         amount: totalAmount.toFixed(2),
    //         lineTotal,
    //         lineAfterDiscount
    //     };
    // };

    const calculateLineTotals = (item, currencyCode) => {
        const qty = parseFloat(item.qty) || 0;
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const discount = parseFloat(item.discount) || 0;
        const taxPercent = parseFloat(item.taxPercent) || 0;
        const vatPercent = parseFloat(item.vatPercent) || 0;

        const lineTotal = qty * unitPrice;
        const lineAfterDiscount = lineTotal - discount;

        // Apply currency-specific rounding
        const taxAmount = roundByCurrency((lineAfterDiscount * taxPercent) / 100, currencyCode);
        const vatAmount = roundByCurrency((lineAfterDiscount * vatPercent) / 100, currencyCode);

        // Row Total = Base - Discount - Tax + VAT
        const totalAmount = roundByCurrency((lineAfterDiscount - taxAmount) + vatAmount, currencyCode);

        return {
            taxAmount,
            vatAmount,
            amount: totalAmount,
            lineTotal,
            lineAfterDiscount
        };
    };

    const handleChange = (selectedOptions) => {
        if (!selectedOptions) {
            setFieldValue("memoNo", []);
            setIsMulti(true);
            return;
        }
        const selectedArray = Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions];
        const isNASelected = selectedArray.some((opt) => opt.value === "NA");
        if (isNASelected) {
            setIsMulti(false);
            setFieldValue("memoNo", [{ label: "NA", value: 0 }]);
        }
        else {
            setIsMulti(true);
            setFieldValue("memoNo", selectedArray);
        }
    };
    const handleDownloadFile = async () => {
        const fileId = purchase_req_id;
        const filePath = previewUrl;
        const fileUrl = await PurchaseRequisitionDownloadFileById(fileId, filePath);
        // if (fileUrl) {
        //     window.open(fileUrl, "_blank");
        //     setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
        // } else {
        //     Swal.fire({
        //         icon: 'error',
        //         title: 'Download Failed',
        //         text: 'Unable to download the file. Please try again later.',
        //     });
        // }
    };

    // Load existing files from backend (mocked for demo)
    // useEffect(() => {
    //     const existingFiles = [
    //         { name: "Existing_Quote.pdf", url: "/files/Existing_Quote.pdf", type: "existing" },
    //         { name: "Drawing.png", url: "/files/Drawing.png", type: "existing" }
    //     ];
    //     setAttachments(existingFiles);
    // }, []);

    // Handle new file selection
    const handleFileChange = (event) => {
        const files = Array.from(event.target.files);

        const validExtensions = ["pdf", "jpeg", "jpg", "png"];
        const maxSize = 2 * 1024 * 1024; // 2 MB in bytes

        let invalidFiles = [];

        const filteredFiles = files.filter((file) => {
            const fileExtension = file.name.split(".").pop().toLowerCase();
            if (!validExtensions.includes(fileExtension) || file.size > maxSize) {
                invalidFiles.push(file.name);
                return false; // skip invalid file
            }
            return true;
        }).map((file) => ({
            file,
            name: file.name,
            type: "new"
        }));

        if (invalidFiles.length > 0) {
            Swal.fire({
                icon: "error",
                title: "Invalid File(s)",
                html: `The following files are not allowed or exceed 2 MB:<br/><b>${invalidFiles.join("<br/>")}</b>`,
            });
        }

        if (filteredFiles.length > 0) {
            setAttachments((prev) => [...prev, ...filteredFiles]);
        }

        event.target.value = null; // reset input
    };

    // Remove file (new or existing)
    const removeAttachment = (index, type) => {
        if (type === "new") {
            const newList = newFiles.filter((_, i) => i !== index);
            setAttachments([...newList, ...existingFiles]);
        } else {
            const newList = existingFiles.filter((_, i) => i !== index);
            setAttachments([...newFiles, ...newList]);
        }
    };

    // File name display
    const attachmentNameTemplate = (rowData) => {
        const handleDownload = (e) => {
            e.preventDefault();
            // For your API, pass file id (if any) and file path
            DownloadPurchaseRequisitionFileById(rowData.prattachid, rowData.filepath);

        };

        return (
            <a
                href="#"
                onClick={handleDownload}
                style={{ cursor: "pointer", color: "#007bff", textDecoration: "underline" }}
            >
                {rowData.name}
            </a>
        );
    };

    // Delete icon
    const actionTemplate = (_, { rowIndex }) => {
        return (
            <span
                onClick={() => removeAttachment(rowIndex, "existing")}
                style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                title="Remove"
            >
                <i className="mdi mdi-trash-can-outline" style={{ fontSize: "1.5rem" }}></i>
            </span>
        );
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <Breadcrumbs title="Procurement" breadcrumbItem="Purchase Requisition" />
                    <Row>
                        <Col lg="12">
                            <Card>
                                <CardBody>
                                    <Formik enableReinitialize initialValues={initialValues} validationSchema={validationSchema} validateOnMount={false} validateOnChange={false} validateOnBlur={true}>
                                        {({ values, errors, touched, setFieldValue, setTouched, validateForm, setFieldTouched }) => {

                                            useEffect(() => {
                                                const fetchPOs = async () => {
                                                    setLoadingPOs(true);
                                                    try {
                                                        const currentPRId = isEditMode ? purchase_req_id : 0;
                                                        const res = await GetAllPO(branchId, orgId, currentPRId);
                                                        if (res?.status && Array.isArray(res.data)) {
                                                            const options = res.data.map(po => ({
                                                                value: po.pono,
                                                                label: po.pono,
                                                                poid: po.poid
                                                            }));
                                                            setPoOptions(options);
                                                        } else {
                                                            setPoOptions([]);
                                                        }
                                                    } catch (err) {
                                                        console.error("Failed to load PO list", err);
                                                        setPoOptions([]);
                                                        Swal.fire("Error", "Could not load PO numbers", "error");
                                                    } finally {
                                                        setLoadingPOs(false);
                                                    }
                                                };

                                                fetchPOs();
                                            }, [branchId, orgId, isEditMode, purchase_req_id]);
                                            // useEffect(() => {
                                            //     let subtotal = 0;
                                            //     let totalDiscount = 0;
                                            //     let totalTax = 0;

                                            //     values.items.forEach((item, index) => {
                                            //         const { lineTotal, taxAmount, amount } = calculateLineTotals(item);
                                            //         subtotal += lineTotal;
                                            //         totalDiscount += parseFloat(item.discount) || 0;
                                            //         totalTax += parseFloat(taxAmount) || 0;

                                            //         // ✅ Update each row's calculated fields
                                            //         setFieldValue(`items[${index}].taxAmount`, taxAmount);
                                            //         setFieldValue(`items[${index}].amount`, amount);
                                            //     });

                                            //     const netTotal = subtotal - totalDiscount + totalTax;

                                            //     setSubTotal(subtotal.toFixed(2));
                                            //     setTotalDiscount(totalDiscount.toFixed(2));
                                            //     setTotalTax(totalTax.toFixed(2));
                                            //     setNetTotal(netTotal.toFixed(2));
                                            // }, [values.items]);

                                            useEffect(() => {
                                                if (isFirstRender.current) {
                                                    isFirstRender.current = false; // skip first render
                                                    return;
                                                }

                                                // Use shared logic for currency identification
                                                const getCurrencyCode = (c) => (typeof c === 'string' ? c : (c?.label || c?.code || "")).trim().toUpperCase();
                                                const currencyCode = getCurrencyCode(values.currency);
                                                const isIDR = currencyCode === 'IDR';

                                                let subtotal = 0;
                                                let totalDiscount = 0;
                                                let totalTaxFooter = 0;
                                                let totalVAT = 0;

                                                const updatedItems = values.items.map((item, index) => {
                                                    const { lineTotal, taxAmount, vatAmount, lineAfterDiscount } = calculateLineTotals(item, currencyCode);

                                                    subtotal += lineTotal;
                                                    totalDiscount += parseFloat(item.discount) || 0;

                                                    // Use helpers for consistency
                                                    const roundedTaxAmount = taxAmount;
                                                    const roundedVatAmount = vatAmount;

                                                    totalTaxFooter += roundedTaxAmount;
                                                    totalVAT += roundedVatAmount;

                                                    // Row Total = Base - Discount - Tax + VAT
                                                    const adjustedAmount = roundByCurrency(lineAfterDiscount - roundedTaxAmount + roundedVatAmount, currencyCode);

                                                    // Return updated item values
                                                    return {
                                                        ...item,
                                                        taxAmount: roundedTaxAmount.toFixed(isIDR ? 0 : 2),
                                                        vatAmount: roundedVatAmount.toFixed(isIDR ? 0 : 2),
                                                        amount: adjustedAmount.toFixed(isIDR ? 0 : 2)
                                                    };
                                                });

                                                const netTotal = roundByCurrency(subtotal - totalDiscount - totalTaxFooter + totalVAT, currencyCode);

                                                // Update items only if they changed to prevent extra renders
                                                const itemsChanged = JSON.stringify(updatedItems) !== JSON.stringify(values.items);
                                                if (itemsChanged) {
                                                    setFieldValue("items", updatedItems);
                                                }

                                                // Update footer totals
                                                setFieldValue("subTotal", roundByCurrency(subtotal, currencyCode).toFixed(isIDR ? 0 : 2));
                                                setFieldValue("discountValue", roundByCurrency(totalDiscount, currencyCode).toFixed(isIDR ? 0 : 2));
                                                setFieldValue("taxValue", roundByCurrency(totalTaxFooter, currencyCode).toFixed(isIDR ? 0 : 2));
                                                setFieldValue("vatValue", roundByCurrency(totalVAT, currencyCode).toFixed(isIDR ? 0 : 2));
                                                setFieldValue("netTotal", netTotal.toFixed(isIDR ? 0 : 2));

                                            }, [values.items, values.currency]);



                                            return (
                                                <Form>
                                                    <div className="row align-items-center g-3 justify-content-end">
                                                        <div className="col-12 col-lg-8 col-md-8 col-sm-8">
                                                            {Object.keys(errors).length > 0 && (
                                                                <div className="alert alert-danger alert-new">
                                                                    <ul className="mb-0">
                                                                        {(() => {
                                                                            // Loop through top-level errors
                                                                            for (const [key, value] of Object.entries(errors)) {

                                                                                // show simple (non-items) errors
                                                                                if (key !== "items") {
                                                                                    return <li>{value}</li>;
                                                                                }

                                                                                // Yup.min(1) => value is STRING, not array
                                                                                if (key === "items" && typeof value === "string") {
                                                                                    return <li>{value}</li>;  //  show “At least one item is required”
                                                                                }

                                                                                //  items array-level errors
                                                                                if (Array.isArray(value)) {
                                                                                    for (let i = 0; i < value.length; i++) {
                                                                                        const itemError = value[i];
                                                                                        if (itemError && typeof itemError === "object") {
                                                                                            const [fieldKey, message] = Object.entries(itemError)[0] || [];
                                                                                            return (
                                                                                                <li>
                                                                                                    <strong>Row {i + 1} : </strong> {message}
                                                                                                </li>
                                                                                            );
                                                                                        }
                                                                                    }
                                                                                }
                                                                            }

                                                                            return null;
                                                                        })()}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="col-12 col-lg-4 col-md-4 col-sm-4 button-items">
                                                            <button type="button" className="btn btn-danger fa-pull-right" onClick={handleCancel}><i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>Close</button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-success fa-pull-right"
                                                                onClick={async () => {
                                                                    setTouched(markAllTouched(values), true);
                                                                    const validationErrors = await validateForm();

                                                                    if (Object.keys(validationErrors).length === 0) {
                                                                        handleSubmit(values, 1); // Post
                                                                    }
                                                                }}
                                                            >
                                                                <i className="bx bxs-save label-icon font-size-16 align-middle me-2"></i>Post
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="btn btn-info fa-pull-right"
                                                                onClick={async () => {
                                                                    setTouched(markAllTouched(values), true);
                                                                    const validationErrors = await validateForm();

                                                                    if (Object.keys(validationErrors).length === 0) {
                                                                        handleSubmit(values, 0); // Save
                                                                    }
                                                                }}
                                                            >
                                                                <i className="bx bx-comment-check label-icon font-size-16 align-middle me-2" ></i>{isEditMode ? "Update" : "Save"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <Row>
                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label>PR No.</Label>
                                                                <Field name="prNo" as={Input} disabled />
                                                            </FormGroup>
                                                        </Col>
                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label>PR Type<span className="text-danger">*</span></Label>
                                                                <Select
                                                                    name="prType"
                                                                    value={prTypes.find(opt => opt.value === Number(values.prType)) || null}
                                                                    options={prTypes}
                                                                    onChange={(option) => {
                                                                        setFieldValue("projectId", 0);
                                                                        setFieldValue("prType", option ? Number(option.value) : null); // Store only number
                                                                    }}
                                                                    isClearable
                                                                />
                                                            </FormGroup>

                                                        </Col>

                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label>PR Date<span className="text-danger">*</span></Label>
                                                                <Flatpickr
                                                                    className="form-control"
                                                                    name="prDate"
                                                                    value={values.prDate}
                                                                    onChange={([date]) => setFieldValue("prDate", date)}
                                                                />
                                                            </FormGroup>
                                                        </Col>

                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label>
                                                                    PM No.<span className="text-danger">*</span>
                                                                </Label>
                                                                <Select
                                                                    name="memoNo"
                                                                    value={values.memoNo}
                                                                    options={memoNo}
                                                                    isClearable
                                                                    isMulti={!values.memoNo.some(opt => opt.value === "NA")}
                                                                    // isMulti={values.memoNo && !values.memoNo.some(opt => opt && opt.value === "NA")}
                                                                    onChange={async (selectedOptions) => {
                                                                        if (!selectedOptions) {
                                                                            setFieldValue("memoNo", []);
                                                                            setFieldValue("items", []); // Clear items if needed
                                                                            setFieldValue("pm_remarks", "");
                                                                            return;
                                                                        }
                                                                        // Ensure selected is always an array
                                                                        const selected = Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions];

                                                                        const isNASelected = selected.some(opt => opt.value === "NA");
                                                                        let finalSelection = selected;

                                                                        // Only enforce "NA only" in CREATE mode
                                                                        if (isNASelected) {
                                                                            finalSelection = [{ label: "NA", value: "NA" }];
                                                                        }

                                                                        setFieldValue("memoNo", finalSelection);

                                                                        // Prepare default row structure
                                                                        const defaultRow = {
                                                                            itemGroupId: null,
                                                                            itemName: null,
                                                                            uom: null,
                                                                            qty: '',
                                                                            unitPrice: '',
                                                                            discount: '',
                                                                            taxPercent: 0,
                                                                            taxAmount: 0,
                                                                            vatPercent: 0,
                                                                            vatAmount: 0,
                                                                            amount: 0,
                                                                            taxSign: '+',
                                                                        };

                                                                        // Handle NA separately
                                                                        if (isNASelected) {
                                                                            setFieldValue("items", [
                                                                                {
                                                                                    memoNo: { label: "NA", value: "NA" },
                                                                                    ...defaultRow,
                                                                                },
                                                                            ]);
                                                                            setFieldValue("pm_remarks", "");
                                                                            return;
                                                                        }

                                                                        // Filter out NA if other options are selected
                                                                        finalSelection = selected.filter(opt => opt && opt.value !== "NA");

                                                                        setFieldValue("memoNo", finalSelection);

                                                                        // For each selected PM, you could fetch PR data or just prepare default rows
                                                                        const rows = [];

                                                                        try {
                                                                            const branchid = 1;
                                                                            const orgid = 1;
                                                                            for (const pm of finalSelection) {
                                                                                const response = await GetPurchaseRequisitionItemDetails(pm.value, orgid, branchid);
                                                                                const data = response;

                                                                                if (data.status && Array.isArray(data.data)) {
                                                                                    const details = data.data.map(detail => ({
                                                                                        memoNo: {
                                                                                            value: detail.memo_id,
                                                                                            label: detail.pm_number
                                                                                        },
                                                                                        itemGroupId: {
                                                                                            value: detail.ItemGroupId,
                                                                                            label: detail.groupname
                                                                                        },
                                                                                        itemName: {
                                                                                            value: detail.itemid,
                                                                                            label: detail.itemname
                                                                                        },
                                                                                        uom: {
                                                                                            value: detail.uomid,
                                                                                            label: detail.uom
                                                                                        },
                                                                                        qty: detail.qty,
                                                                                        unitPrice: detail.unitPrice ?? 0,
                                                                                        discount: detail.discountValue ?? 0,
                                                                                        // taxPercent: detail.taxperc ?? 0,
                                                                                        taxPercent: 0,
                                                                                        taxAmount: detail.taxValue ?? 0,
                                                                                        // vatPercent: detail.vatPerc ?? 0,
                                                                                        vatPercent: 0,
                                                                                        vatAmount: detail.vatValue ?? 0,
                                                                                        taxSign: '+',
                                                                                        amount: detail.netTotal ?? 0
                                                                                    }));

                                                                                    rows.push(...details);
                                                                                }
                                                                            }

                                                                            setFieldValue("items", rows);

                                                                            const selectedRemarks = finalSelection
                                                                                .map(pm => `${pm.label} : ${pm.remarks}`)
                                                                                .filter(Boolean);

                                                                            const remarksText = selectedRemarks.map(r => `• ${r}`).join("\n");

                                                                            setFieldValue("pm_remarks", remarksText || "");
                                                                        } catch (error) {
                                                                            console.error("Error fetching PR items:", error);
                                                                            setFieldValue("items", []);
                                                                        }
                                                                    }}
                                                                />
                                                            </FormGroup>
                                                        </Col>

                                                        {Number(values.prType) === 4 && (
                                                            <Col md={4}>
                                                                <FormGroup>
                                                                    <Label>Projects</Label>

                                                                    <Select
                                                                        name="projectId"
                                                                        value={projects.find(opt => opt.value === Number(values.projectId)) || null}
                                                                        options={projects}
                                                                        onChange={(option) => {


                                                                            setFieldValue("projectId", option ? Number(option.value) : null); // Store only number
                                                                        }}
                                                                        isClearable
                                                                    />

                                                                </FormGroup>

                                                            </Col>
                                                        )}
                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label>
                                                                    PO Reference
                                                                    {/* {([3, 5].includes(Number(values.prType))) && <span className="text-danger">*</span>} */}
                                                                </Label>

                                                                <Select
                                                                    name="poReference"
                                                                    value={poOptions.find(opt => opt.value === values.poReference) || null}
                                                                    onChange={(option) => {
                                                                        if (option) {
                                                                            setFieldValue("poReference", option.value);     // e.g., "PO000001"
                                                                            setFieldValue("po_ref_id", option.poid);    // e.g., 18
                                                                        } else {
                                                                            setFieldValue("poReference", null);
                                                                            setFieldValue("po_ref_id", 0);
                                                                        }
                                                                    }}
                                                                    options={poOptions}
                                                                    isLoading={loadingPOs}
                                                                    isClearable={true}
                                                                    isSearchable={true}
                                                                    placeholder={loadingPOs ? "Loading POs..." : "Select PO Reference"}
                                                                    menuPortalTarget={document.body}
                                                                    classNamePrefix="react-select"
                                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                                    // Optional: Show PO ID in dropdown for clarity
                                                                    formatOptionLabel={(option) => (
                                                                        <div>
                                                                            {option.label}
                                                                        </div>
                                                                    )}
                                                                />

                                                                {errors.poReference && touched.poReference && (
                                                                    <div className="text-danger small mt-1">
                                                                        {errors.poReference}
                                                                    </div>
                                                                )}
                                                            </FormGroup>
                                                        </Col>
                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label>Supplier<span className="text-danger">*</span></Label>
                                                                <Select
                                                                    name="supplier"
                                                                    value={values.supplier}
                                                                    options={suppliers}
                                                                    onChange={async (option) => {
                                                                        setFieldValue("supplier", option);

                                                                        if (option?.value) {
                                                                            const supId = option.value;

                                                                            // ✅ Auto-set Payment Term if available
                                                                            if (option.peymenttermid) {
                                                                                const matchedPaymentTerm = paymentTerms.find(
                                                                                    (pt) => pt.value === option.peymenttermid
                                                                                );
                                                                                setFieldValue("paymentTerm", matchedPaymentTerm || null);
                                                                            } else {
                                                                                setFieldValue("paymentTerm", null);
                                                                            }

                                                                            // ✅ Auto-set Delivery Term if available
                                                                            if (option.deliverytermid) {
                                                                                const matchedDeliveryTerm = deliveryTerms.find(
                                                                                    (dt) => dt.value === option.deliverytermid
                                                                                );
                                                                                setFieldValue("deliveryTerm", matchedDeliveryTerm || null);
                                                                            } else {
                                                                                setFieldValue("deliveryTerm", null);
                                                                            }

                                                                            // ✅ Fetch Supplier Currency
                                                                            const currencyRes = await GetSupplierCurrency(supId, orgId);

                                                                            if (currencyRes?.status && currencyRes.data?.length > 0) {
                                                                                const options = currencyRes.data.map((item) => ({
                                                                                    value: item.currencyid,
                                                                                    label: item.currencycode,
                                                                                }));
                                                                                setCurrency(options);

                                                                                const first = currencyRes.data[0];

                                                                                setFieldValue("email", first.Email || "");
                                                                                setFieldValue("contact", first.PhoneNo || "");
                                                                                setFieldValue("name", first.SupplierName || "");
                                                                                setFieldValue("address", first.Address1 || "");
                                                                            } else {
                                                                                setFieldValue("email", "");
                                                                                setFieldValue("contact", "");
                                                                                setFieldValue("name", "");
                                                                                setFieldValue("address", "");
                                                                                setCurrency([]);
                                                                            }
                                                                        } else {
                                                                            // Supplier cleared
                                                                            setFieldValue("email", "");
                                                                            setFieldValue("contact", "");
                                                                            setFieldValue("name", "");
                                                                            setFieldValue("address", "");
                                                                            setFieldValue("paymentTerm", null);
                                                                            setFieldValue("deliveryTerm", null);
                                                                            setCurrency([]);
                                                                        }
                                                                    }}
                                                                    isClearable
                                                                />

                                                            </FormGroup>
                                                        </Col>
                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label>Currency<span className="text-danger">*</span></Label>
                                                                <Select
                                                                    name="currency"
                                                                    value={values.currency}
                                                                    options={currency}
                                                                    onChange={async (option) => setFieldValue("currency", option)}
                                                                    isClearable
                                                                    onMenuOpen={async () => {
                                                                        if (values.supplier?.value) {
                                                                            const currencyRes = await GetSupplierCurrency(values.supplier.value, orgId);

                                                                            if (currencyRes?.status && currencyRes.data?.length > 0) {
                                                                                const options = currencyRes.data.map((item) => ({
                                                                                    value: item.currencyid,
                                                                                    label: item.currencycode,
                                                                                }));
                                                                                setCurrency(options);
                                                                            } else {
                                                                                setCurrency([]);
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            </FormGroup>
                                                        </Col>

                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label>Payment Term<span className="text-danger">*</span></Label>
                                                                <Select
                                                                    name="paymentTerm"
                                                                    value={values.paymentTerm}
                                                                    options={paymentTerms}
                                                                    onChange={(option) => setFieldValue("paymentTerm", option)}
                                                                    isClearable

                                                                />
                                                            </FormGroup>
                                                        </Col>

                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label>Sup. Address</Label>
                                                                <Field disabled={true} name="address" as={Input} />
                                                            </FormGroup>
                                                        </Col>

                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label>Delivery Term<span className="text-danger">*</span></Label>
                                                                <Select
                                                                    name="deliveryTerm"
                                                                    value={values.deliveryTerm}
                                                                    options={deliveryTerms}
                                                                    onChange={(option) => setFieldValue("deliveryTerm", option)}
                                                                    isClearable

                                                                />
                                                            </FormGroup>
                                                        </Col>

                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label>Requestor<span className="text-danger">*</span></Label>
                                                                <Select
                                                                    name="requestor"
                                                                    value={values.requestor}
                                                                    options={requestors}
                                                                    onChange={(option) => setFieldValue("requestor", option)}
                                                                    isClearable
                                                                />
                                                            </FormGroup>
                                                        </Col>

                                                        {/* <Col md={4}>
                                                            <FormGroup>
                                                                <Label>Sup. Name<span className="text-danger">*</span></Label>
                                                                <Field  name="name" as={Input} />
                                                            </FormGroup>
                                                        </Col> */}

                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label>BTG Delivery Address<span className="text-danger">*</span></Label>
                                                                <Field maxLength={200} name="deliveryAddress" as={Input} type="text" />
                                                            </FormGroup>
                                                        </Col>

                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label>Sup. Contact<span className="text-danger">*</span></Label>
                                                                <Field disabled={true} name="contact" as={Input} />
                                                            </FormGroup>
                                                        </Col>

                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label>Sup. Email<span className="text-danger"> </span></Label>
                                                                <Field disabled={true} name="email" as={Input} type="email" />
                                                            </FormGroup>
                                                        </Col>
                                                        <Col md={4}>
                                                            {/* <Row className="align-items-center"> */}
                                                            {/* File Input */}
                                                            {/* <Col xs={isEditMode && previewUrl ? 6 : 12}>
                                                                    <Label htmlFor="attachment">
                                                                        Quotation Attachment<span className="text-danger">*</span>
                                                                    </Label>
                                                                    <input
                                                                        type="file"
                                                                        name="attachment"
                                                                        className="form-control"
                                                                        accept=".jpg,.jpeg,.png,.pdf"
                                                                        multiple
                                                                        onChange={(event) => {
                                                                            const files = Array.from(event.currentTarget.files);
                                                                            setFieldValue("attachment", files);

                                                                            if (files.length > 0) {
                                                                                const localUrl = URL.createObjectURL(files[0]);
                                                                                setPreviewUrl(localUrl);
                                                                            }
                                                                        }}
                                                                    />
                                                                    <small className="form-text text-danger">
                                                                        Only PDF, JPEG, PNG. File Size should be within 2 MB
                                                                    </small>
                                                                </Col> */}

                                                            <div className="col-xl-12 mt-lg-4">
                                                                <Col md="12">
                                                                    <div className="d-flex align-items-end gap-2">
                                                                        <Label for="remarks"  >Quotation Attachment  </Label>
                                                                        <button type="button" className="btn btn-success " onClick={toggleModal}>
                                                                            <i className="fa fa-paperclip label-icon font-size-14 align-middle me-2"></i>Add
                                                                        </button>
                                                                    </div>
                                                                    <small className="form-text text-danger">
                                                                        Only PDF, JPEG, PNG. File Size should be within 2 MB
                                                                    </small>
                                                                </Col>
                                                                <Modal isOpen={showModal} toggle={toggleModal} >
                                                                    <ModalHeader toggle={toggleModal}>Upload Attachments</ModalHeader>
                                                                    <ModalBody>
                                                                        {/* File Upload Field */}
                                                                        <input
                                                                            type="file"
                                                                            accept=".jpg,.jpeg,.png,.pdf"
                                                                            multiple
                                                                            onChange={handleFileChange}
                                                                            className="form-control mb-2"
                                                                        />
                                                                        <small className="form-text text-danger mb-3">
                                                                            Only PDF, JPEG, PNG. File Size should be within 2 MB
                                                                        </small>

                                                                        {/* New Files List */}
                                                                        {newFiles.length > 0 && (
                                                                            <div className="mb-3">
                                                                                <ul className="list-unstyled">
                                                                                    {newFiles.map((file, index) => (
                                                                                        <li key={index} className="d-flex justify-content-between align-items-center mb-1">
                                                                                            {file.name}
                                                                                            <span
                                                                                                onClick={() => removeAttachment(index, "new")}
                                                                                                style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                                                                                                title="Remove"
                                                                                            >
                                                                                                <i className="mdi mdi-trash-can-outline" style={{ fontSize: "1.5rem" }}></i>
                                                                                            </span>
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        )}

                                                                        {/* Existing Attachments Table */}
                                                                        {existingFiles.length > 0 && (
                                                                            <div>
                                                                                <DataTable value={existingFiles} responsiveLayout="scroll">
                                                                                    <Column
                                                                                        header="#"
                                                                                        body={(_, { rowIndex }) => rowIndex + 1}
                                                                                        style={{ width: "50px" }}
                                                                                    />
                                                                                    <Column
                                                                                        header="Attachment"
                                                                                        body={attachmentNameTemplate}
                                                                                    />
                                                                                    {/* <Column
                                                                                            header="Action"
                                                                                            body={actionTemplate}
                                                                                            style={{ width: "80px", textAlign: "center" }}
                                                                                        /> */}
                                                                                </DataTable>
                                                                            </div>
                                                                        )}
                                                                    </ModalBody>
                                                                    <ModalFooter>
                                                                        <Button color="secondary" onClick={toggleModal}>Close</Button>
                                                                    </ModalFooter>
                                                                </Modal>
                                                            </div>

                                                            {/* <div className="align-items-center">
                                                                    <FormGroup>
                                                                        <Label>Quotation Attachment<span className="text-danger">*</span></Label>
                                                                        <Button color="primary" onClick={toggleModal}>
                                                                            Add / Show Attachments
                                                                        </Button>
                                                                    </FormGroup>

                                                                    <Modal isOpen={showModal} toggle={toggleModal} size="lg">
                                                                        <ModalHeader toggle={toggleModal}>Upload Attachments</ModalHeader>
                                                                        <ModalBody>
                                                                            <input
                                                                                type="file"
                                                                                accept=".jpg,.jpeg,.png,.pdf"
                                                                                multiple
                                                                                onChange={handleFileChange}
                                                                                className="form-control mb-3"
                                                                            />
                                                                            <small className="form-text text-danger">
                                                                                Only PDF, JPEG, PNG. File Size should be within 2 MB
                                                                            </small>

                                                                            {attachments.length > 0 && (
                                                                                <DataTable value={attachments} responsiveLayout="scroll">
                                                                                    <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} style={{ width: "50px" }} />
                                                                                    <Column header="Attachment" body={attachmentNameTemplate} />
                                                                                    <Column header="Source" body={sourceTemplate} style={{ width: "120px" }} />
                                                                                    <Column header="Action" body={actionTemplate} style={{ width: "80px", textAlign: "center" }} />
                                                                                </DataTable>
                                                                            )}
                                                                        </ModalBody>
                                                                        <ModalFooter>
                                                                            <Button color="secondary" onClick={toggleModal}>Close</Button>
                                                                        </ModalFooter>
                                                                    </Modal>
                                                                </div> */}

                                                            {/* Preview Button */}
                                                            {/* {isEditMode && previewUrl && (
                                                                    <Col xs={6} className="pt-1 text-align-right">
                                                                        <button
                                                                            type="button"
                                                                            className="btn d-flex align-items-center justify-content-between"
                                                                            onClick={handleDownloadFile}
                                                                            style={{
                                                                                maxWidth: "100%",
                                                                                overflow: "hidden",
                                                                                textOverflow: "ellipsis",
                                                                                whiteSpace: "nowrap",
                                                                            }}
                                                                        >
                                                                            <span
                                                                                style={{
                                                                                    flexGrow: 1,
                                                                                    overflow: "hidden",
                                                                                    textOverflow: "ellipsis",
                                                                                    whiteSpace: "nowrap",
                                                                                    color: "blue"
                                                                                }}
                                                                                title={fileName}
                                                                            >
                                                                                {fileName}
                                                                            </span>
                                                                            <i className="mdi mdi-cloud-download mdi-24px text-primary ms-2"></i>
                                                                        </button>
                                                                    </Col>
                                                                )} */}

                                                            {/* </Row> */}
                                                        </Col>

                                                        <Col md={12}>
                                                            <FormGroup>
                                                                <Label>PM Remarks</Label>
                                                                <Field name="pm_remarks" as="textarea" className="form-control" disabled />
                                                            </FormGroup>
                                                        </Col>
                                                        <Col md={12}>
                                                            <FormGroup>
                                                                <Label>Remarks</Label>



                                                                <Field name="remarks" maxLength={500} as="textarea" className="form-control" />
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>
                                                    <div style={{ overflowX: "auto" }}>
                                                        <Table className="ProcurementTable table mb-0" style={{ minWidth: "1800px" }}>
                                                            <thead style={{ backgroundColor: "#3e90e2" }}>
                                                                <tr>
                                                                    <th className="text-center" style={{ width: "2%" }}>Action</th>
                                                                    {/* <th className="text-center">S.No.</th> */}
                                                                    <th className="text-center" style={{ width: "5%" }}>PM No.</th>
                                                                    <th className="text-center" style={{ width: "8%" }}>Item Group</th>
                                                                    <th className="text-center" style={{ width: "12%" }}>Item Name</th>

                                                                    <th className="text-center" style={{ width: "6%" }}>Qty</th>
                                                                    <th className="text-center" style={{ width: "6%" }}>UOM</th>
                                                                    <th className="text-center" style={{ width: "8%" }}>Unit Price</th>
                                                                    <th className="text-center" style={{ width: "6%" }}>Discount</th>
                                                                    <th className="text-center" style={{ width: "6%" }}>Tax</th>
                                                                    <th className="text-center" style={{ width: "4%" }}>Tax %</th>
                                                                    {/* <th className="text-center" style={{ width: "8%" }}>Tax (+/-)</th> */}
                                                                    <th className="text-center" style={{ width: "5%" }}>Tax Amount</th>
                                                                    <th className="text-center" style={{ width: "6%" }}>VAT</th>
                                                                    <th className="text-center" style={{ width: "4%" }}>VAT %</th>
                                                                    <th className="text-center" style={{ width: "5%" }}>VAT Amount</th>
                                                                    <th className="text-center" style={{ width: "8%" }}>Total Amount</th>
                                                                </tr>
                                                            </thead>

                                                            <FieldArray name="items">
                                                                {({ push, remove }) => (
                                                                    <>
                                                                        <tbody>
                                                                            {values.items.map((item, i) => (
                                                                                <tr key={i}>
                                                                                    {/* Hidden PRDId Field */}


                                                                                    {/* Remove Button */}
                                                                                    <td className="text-center align-middle">
                                                                                        <button
                                                                                            type="button"
                                                                                            className="btn btn-sm btn-danger"
                                                                                            onClick={() => remove(i)}
                                                                                            title="Remove Row"
                                                                                            style={{ background: 'none', border: 'none', padding: 0 }}
                                                                                        >
                                                                                            <i
                                                                                                className="mdi mdi-delete-outline text-danger"
                                                                                                style={{ fontSize: '18px', cursor: 'pointer' }}
                                                                                            ></i>
                                                                                        </button>
                                                                                    </td>

                                                                                    {/* <td className="text-center align-middle">{i + 1}</td> */}

                                                                                    <td className="text-center align-middle">
                                                                                        {item.memoNo?.label || ""}
                                                                                    </td>

                                                                                    {/* Item Group */}
                                                                                    <td>
                                                                                        {item.memoNo?.label === 'NA' ? (
                                                                                            <Select
                                                                                                menuPortalTarget={document.body}

                                                                                                value={itemGroupOptions?.find(opt => opt.value === item.itemGroupId?.value) || null}
                                                                                                onChange={(selected) => {
                                                                                                    setFieldValue(`items[${i}].itemGroupId`, selected || "");
                                                                                                    setFieldValue(`items[${i}].itemName`, null);
                                                                                                    setFieldValue(`items[${i}].uom`, null);
                                                                                                    setFieldValue(`items[${i}].availableStock`, "");
                                                                                                    setFieldValue(`items[${i}].prdId`, "");
                                                                                                    // setFieldValue(`items[${i}].taxPercent`, "0");
                                                                                                    // setFieldValue(`items[${i}].vatPercent`, "0");
                                                                                                    if (selected?.value) {
                                                                                                        loadItemNameOptions(selected.value, i); // Fetch item names for this row
                                                                                                    } else {
                                                                                                        setItemOptions(prev => {
                                                                                                            const updated = [...prev];
                                                                                                            updated[i] = [];
                                                                                                            return updated;
                                                                                                        });
                                                                                                    }
                                                                                                }}
                                                                                                options={itemGroupOptions || []}
                                                                                                placeholder="Select Group"
                                                                                                classNamePrefix="react-select"
                                                                                            />
                                                                                        ) : (
                                                                                            <div className="form-control">
                                                                                                {item.itemGroupId?.label || "-"}
                                                                                            </div>
                                                                                        )}
                                                                                        {errors.items?.[i]?.itemGroupId && touched.items?.[i]?.itemGroupId && (
                                                                                            <div className="text-danger small">{errors.items[i].itemGroupId}</div>
                                                                                        )}
                                                                                    </td>

                                                                                    {/* Item Name */}
                                                                                    <td>
                                                                                        {item.memoNo?.label === 'NA' ? (
                                                                                            <Select
                                                                                                name={`items[${i}].itemName`}
                                                                                                value={
                                                                                                    item.itemName || null
                                                                                                }
                                                                                                menuPortalTarget={document.body}

                                                                                                options={itemOptions[i] || []}
                                                                                                onChange={(option) => {
                                                                                                    setFieldValue(`items[${i}].itemName`, option);
                                                                                                    setFieldValue(`items[${i}].availableStock`, option?.stock || "");
                                                                                                    setFieldValue(`items[${i}].prdId`, option?.prdId || "");

                                                                                                    const matchedUom = uomOptions.find(opt => opt.value === option?.uom) || null;
                                                                                                    setFieldValue(`items[${i}].uom`, matchedUom || null);
                                                                                                    // setFieldValue(`items[${i}].taxPercent`, option?.taxperc || "0");
                                                                                                    // setFieldValue(`items[${i}].vatPercent`, option?.vatPerc || "0");
                                                                                                }}
                                                                                                placeholder="Select Item"
                                                                                                isClearable
                                                                                                classNamePrefix="react-select"
                                                                                            />
                                                                                        ) : (
                                                                                            <div className="form-control">
                                                                                                {item.itemName?.label || "-"}
                                                                                            </div>
                                                                                        )}
                                                                                        {errors.items?.[i]?.itemName && touched.items?.[i]?.itemName && (
                                                                                            <div className="text-danger small">{errors.items[i].itemName}</div>
                                                                                        )}
                                                                                    </td>



                                                                                    {/* Qty */}
                                                                                    <td>
                                                                                        {/* <Field
                                                                                            name={`items[${i}].qty`}
                                                                                            type="text"
                                                                                            inputMode="decimal"
                                                                                            className="form-control text-center"
                                                                                            value={values.items[i].qty ? Number(values.items[i].qty).toLocaleString() : ''}
                                                                                            onChange={(e) => {
                                                                                                let raw = e.target.value.replace(/,/g, "");
                                                                                                if (!/^\d*\.?\d*$/.test(raw)) return;
                                                                                                setFieldValue(`items[${i}].qty`, raw);
                                                                                            }}
                                                                                        /> */}
                                                                                        <Field name={`items[${i}].qty`}>
                                                                                            {({ field }) => {
                                                                                                const formatWithCommas = (value) => {
                                                                                                    if (!value) return '';
                                                                                                    const [intPart, decPart] = value.split('.');
                                                                                                    const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                                                                                    return decPart !== undefined
                                                                                                        ? `${intFormatted}.${decPart.slice(0, 3)}`
                                                                                                        : intFormatted;
                                                                                                };

                                                                                                return (
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        className={`form-control text-end ${errors?.items?.[i]?.qty && touched?.items?.[i]?.qty
                                                                                                            ? 'is-invalid'
                                                                                                            : ''
                                                                                                            }`}

                                                                                                        value={formatWithCommas(field.value?.toString() || '')}

                                                                                                        onChange={(e) => {
                                                                                                            // Remove commas
                                                                                                            let plainValue = e.target.value.replace(/,/g, '');

                                                                                                            // Allow only digits and one decimal point
                                                                                                            if (!/^\d*\.?\d*$/.test(plainValue)) {
                                                                                                                return; // Ignore invalid characters
                                                                                                            }

                                                                                                            // Enforce DECIMAL(24,6) → allow 16 digits before decimal, 6 after
                                                                                                            if (plainValue.includes('.')) {
                                                                                                                const [intPart, decPart] = plainValue.split('.');
                                                                                                                plainValue = intPart.slice(0, 12) + '.' + (decPart ? decPart.slice(0, 3) : '');
                                                                                                            } else {
                                                                                                                plainValue = plainValue.slice(0, 12);
                                                                                                            }

                                                                                                            setFieldValue(`items[${i}].qty`, plainValue);
                                                                                                        }}

                                                                                                    />
                                                                                                );
                                                                                            }}
                                                                                        </Field>
                                                                                        {errors.items?.[i]?.qty && touched.items?.[i]?.qty && (
                                                                                            <div className="text-danger small">{errors.items[i].qty}</div>
                                                                                        )}
                                                                                    </td>
                                                                                    {/* UOM */}
                                                                                    <td>
                                                                                        {item.memoNo?.label === 'NA' ? (
                                                                                            <Select
                                                                                                menuPortalTarget={document.body}
                                                                                                // isDisabled={true}
                                                                                                value={uomOptions.find(opt => opt.value === item.uom?.value) || null}
                                                                                                onChange={(selected) => setFieldValue(`items[${i}].uom`, selected || "")}
                                                                                                options={uomOptions}
                                                                                                placeholder="Select"
                                                                                                classNamePrefix="react-select"

                                                                                            />
                                                                                        ) : (
                                                                                            <div className="form-control ">
                                                                                                {item.uom?.label || item.uom || "-"}
                                                                                            </div>
                                                                                        )}
                                                                                        {errors.items?.[i]?.uom && touched.items?.[i]?.uom && (
                                                                                            <div className="text-danger small">{errors.items[i].uom}</div>
                                                                                        )}
                                                                                    </td>

                                                                                    <Field
                                                                                        name={`items[${i}].prdId`}
                                                                                        type="hidden"
                                                                                    />


                                                                                    {/* Unit Price */}
                                                                                    <td>


                                                                                        <Field name={`items[${i}].unitPrice`}>
                                                                                            {({ field }) => {
                                                                                                const formatWithCommas = (value) => {
                                                                                                    if (!value) return '';
                                                                                                    const [intPart, decPart] = value.split('.');
                                                                                                    const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                                                                                    return decPart !== undefined
                                                                                                        ? `${intFormatted}.${decPart.slice(0, 3)}`
                                                                                                        : intFormatted;
                                                                                                };

                                                                                                return (
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        className={`form-control text-end ${errors?.items?.[i]?.unitPrice && touched?.items?.[i]?.unitPrice
                                                                                                            ? 'is-invalid'
                                                                                                            : ''
                                                                                                            }`}

                                                                                                        value={formatWithCommas(field.value?.toString() || '')}

                                                                                                        onChange={(e) => {
                                                                                                            // Remove commas
                                                                                                            let plainValue = e.target.value.replace(/,/g, '');

                                                                                                            // Allow only digits and one decimal point
                                                                                                            if (!/^\d*\.?\d*$/.test(plainValue)) {
                                                                                                                return; // Ignore invalid characters
                                                                                                            }

                                                                                                            // Enforce DECIMAL(24,6) → allow 16 digits before decimal, 6 after
                                                                                                            if (plainValue.includes('.')) {
                                                                                                                const [intPart, decPart] = plainValue.split('.');
                                                                                                                plainValue = intPart.slice(0, 12) + '.' + (decPart ? decPart.slice(0, 3) : '');
                                                                                                            } else {
                                                                                                                plainValue = plainValue.slice(0, 12);
                                                                                                            }

                                                                                                            setFieldValue(`items[${i}].unitPrice`, plainValue);
                                                                                                        }}

                                                                                                    />
                                                                                                );
                                                                                            }}
                                                                                        </Field>

                                                                                        {/* <Field
                                                                                            name={`items[${i}].unitPrice`}
                                                                                            type="text"
                                                                                            inputMode="decimal"
                                                                                            className="form-control text-end"
                                                                                        /> */}
                                                                                        {errors.items?.[i]?.unitPrice && touched.items?.[i]?.unitPrice && (
                                                                                            <div className="text-danger small">{errors.items[i].unitPrice}</div>
                                                                                        )}
                                                                                    </td>

                                                                                    {/* Discount */}
                                                                                    <td>
                                                                                        <Field name={`items[${i}].discount`}>
                                                                                            {({ field }) => {
                                                                                                const formatWithCommas = (value) => {
                                                                                                    if (!value) return '';
                                                                                                    const [intPart, decPart] = value.split('.');
                                                                                                    const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                                                                                    return decPart !== undefined
                                                                                                        ? `${intFormatted}.${decPart.slice(0, 2)}`
                                                                                                        : intFormatted;
                                                                                                };

                                                                                                return (
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        className={`form-control text-end ${errors?.items?.[i]?.discount && touched?.items?.[i]?.discount
                                                                                                            ? 'is-invalid'
                                                                                                            : ''
                                                                                                            }`}

                                                                                                        value={formatWithCommas(field.value?.toString() || '')}

                                                                                                        onChange={(e) => {
                                                                                                            // Keep only digits and one decimal point
                                                                                                            let plainValue = e.target.value.replace(/,/g, '');
                                                                                                            if (!/^\d*\.?\d*$/.test(plainValue)) {
                                                                                                                return; // Ignore invalid characters
                                                                                                            }

                                                                                                            // Enforce DECIMAL(18,6) → 12 digits before decimal, 6 after
                                                                                                            if (plainValue.includes('.')) {
                                                                                                                const [intPart, decPart] = plainValue.split('.');
                                                                                                                plainValue = intPart.slice(0, 12) + '.' + decPart.slice(0, 2);
                                                                                                            } else {
                                                                                                                plainValue = plainValue.slice(0, 12);
                                                                                                            }

                                                                                                            setFieldValue(`items[${i}].discount`, plainValue);


                                                                                                        }}

                                                                                                    />
                                                                                                );
                                                                                            }}
                                                                                        </Field>

                                                                                        {/* <Field
                                                                                            name={`items[${i}].discount`}
                                                                                            type="text"
                                                                                            inputMode="decimal"
                                                                                            className="form-control text-end"
                                                                                        /> */}
                                                                                        {errors.items?.[i]?.discount && touched.items?.[i]?.discount && (
                                                                                            <div className="text-danger small">{errors.items[i].discount}</div>
                                                                                        )}
                                                                                    </td>

                                                                                    <td>
                                                                                        <Select
                                                                                            menuPortalTarget={document.body}

                                                                                            value={
                                                                                                taxList?.find(opt => opt.value === item.taxId?.value) || null
                                                                                            }
                                                                                            onChange={(selected) => {
                                                                                                setFieldValue(`items[${i}].taxId`, selected || "");
                                                                                                if (selected) {
                                                                                                    setFieldValue(`items[${i}].taxPercent`, selected.taxperc || 0);

                                                                                                } else {
                                                                                                    setFieldValue(`items[${i}].taxPercent`, "0");

                                                                                                }
                                                                                            }}
                                                                                            options={taxList || []}
                                                                                            placeholder="Select"
                                                                                            classNamePrefix="react-select"
                                                                                        />
                                                                                        {errors.items?.[i]?.taxId && touched.items?.[i]?.taxId && (
                                                                                            <div className="text-danger small">{errors.items[i].taxId}</div>
                                                                                        )}
                                                                                    </td>

                                                                                    {/* Tax % */}
                                                                                    <td>
                                                                                        <Field
                                                                                            name={`items[${i}].taxPercent`}
                                                                                            type="text"
                                                                                            inputMode="decimal"
                                                                                            className="form-control text-end"
                                                                                            disabled
                                                                                        />
                                                                                        {errors.items?.[i]?.taxPercent && touched.items?.[i]?.taxPercent && (
                                                                                            <div className="text-danger small">{errors.items[i].taxPercent}</div>
                                                                                        )}
                                                                                    </td>
                                                                                    {/* Tax Sign */}
                                                                                    {/* <td className="text-center">
                                                                                        <div className="d-flex justify-content-center">
                                                                                            <label className="me-1">
                                                                                                <Field
                                                                                                    type="radio"
                                                                                                    name={`items[${i}].taxSign`}
                                                                                                    value="+"
                                                                                                    className="form-check-input"
                                                                                                    checked={values.items[i].taxSign === "+"}
                                                                                                /> +
                                                                                            </label>
                                                                                            <label>
                                                                                                <Field
                                                                                                    type="radio"
                                                                                                    name={`items[${i}].taxSign`}
                                                                                                    value="-"
                                                                                                    className="form-check-input"
                                                                                                    checked={values.items[i].taxSign === "-"}
                                                                                                /> -
                                                                                            </label>
                                                                                        </div>
                                                                                    </td> */}

                                                                                    {/* Tax Amount */}
                                                                                    <td className="text-end align-middle">
                                                                                        <div className="form-control-plaintext">
                                                                                            {parseFloat(values.items[i]?.taxAmount)?.toLocaleString('en-US', {
                                                                                                style: 'decimal',
                                                                                                minimumFractionDigits: 2
                                                                                            }) || "0.00"}
                                                                                        </div>
                                                                                        {errors.items?.[i]?.taxAmount && touched.items?.[i]?.taxAmount && (
                                                                                            <div className="text-danger small">{errors.items[i].taxAmount}</div>
                                                                                        )}
                                                                                    </td>

                                                                                    <td style={{ width: "200px" }}>
                                                                                        <Select
                                                                                            value={
                                                                                                vatList?.find(opt => opt.value === item.vatId?.value) || null
                                                                                            }
                                                                                            menuPortalTarget={document.body}

                                                                                            className="w-72"
                                                                                            onChange={(selected) => {
                                                                                                setFieldValue(`items[${i}].vatId`, selected || "");
                                                                                                if (selected) {

                                                                                                    setFieldValue(`items[${i}].vatPercent`, selected.vatperc || 0);
                                                                                                } else {

                                                                                                    setFieldValue(`items[${i}].vatPercent`, "0");
                                                                                                }
                                                                                            }}
                                                                                            options={vatList || []}
                                                                                            placeholder="Select"
                                                                                            classNamePrefix="react-select"
                                                                                        />
                                                                                        {errors.items?.[i]?.vatId && touched.items?.[i]?.vatId && (
                                                                                            <div className="text-danger small">{errors.items[i].vatId}</div>
                                                                                        )}
                                                                                    </td>
                                                                                    {/* VAT % */}
                                                                                    <td>
                                                                                        <Field
                                                                                            name={`items[${i}].vatPercent`}
                                                                                            type="text"
                                                                                            inputMode="decimal"
                                                                                            className="form-control text-end"
                                                                                            disabled
                                                                                            style={{ width: "100px" }}
                                                                                        />
                                                                                        {errors.items?.[i]?.vatPercent && touched.items?.[i]?.vatPercent && (
                                                                                            <div className="text-danger small">{errors.items[i].vatPercent}</div>
                                                                                        )}
                                                                                    </td>

                                                                                    {/* VAT Amount */}
                                                                                    <td className="text-end align-middle">
                                                                                        <div className="form-control-plaintext">
                                                                                            {parseFloat(values.items[i]?.vatAmount)?.toLocaleString('en-US', {
                                                                                                style: 'decimal',
                                                                                                minimumFractionDigits: 2
                                                                                            }) || "0.00"}
                                                                                        </div>
                                                                                        {errors.items?.[i]?.vatAmount && touched.items?.[i]?.vatAmount && (
                                                                                            <div className="text-danger small">{errors.items[i].vatAmount}</div>
                                                                                        )}
                                                                                    </td>


                                                                                    {/* Total Amount */}
                                                                                    <td className="text-end align-middle">
                                                                                        <div className="form-control-plaintext">
                                                                                            {parseFloat(values.items[i]?.amount)?.toLocaleString('en-US', {
                                                                                                style: 'decimal',
                                                                                                minimumFractionDigits: 2
                                                                                            }) || "0.00"}
                                                                                        </div>
                                                                                        {errors.items?.[i]?.amount && touched.items?.[i]?.amount && (
                                                                                            <div className="text-danger small">{errors.items[i].amount}</div>
                                                                                        )}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>

                                                                        {/* FOOTER */}
                                                                        <tfoot>
                                                                            <tr>
                                                                                <td colSpan={11} rowSpan={7}>
                                                                                    <button
                                                                                        type="button"
                                                                                        className="btn btn-sm"
                                                                                        style={{ borderColor: "black", color: "black" }}
                                                                                        onClick={() =>
                                                                                            push({
                                                                                                prdId: "",
                                                                                                memoNo: { value: "NA", label: "NA" },
                                                                                                itemGroupId: null,
                                                                                                itemName: null,
                                                                                                uom: "",
                                                                                                qty: "",
                                                                                                availableStock: "",
                                                                                                deliveryDate: "",
                                                                                                unitPrice: "",
                                                                                                discount: "",
                                                                                                taxId: 0,
                                                                                                vatId: 0,
                                                                                                taxPercent: 0,
                                                                                                taxAmount: "",
                                                                                                vatPercent: 0,
                                                                                                vatAmount: "",
                                                                                                amount: "",
                                                                                                taxSign: "-",
                                                                                            })
                                                                                        }
                                                                                    >
                                                                                        +
                                                                                    </button>
                                                                                </td>
                                                                                <td colSpan={2} className="align-middle text-end">
                                                                                    <strong>Sub Total</strong>
                                                                                </td>
                                                                                <td className="align-middle text-end">{values.currency?.label ?? "-"}</td>
                                                                                <td className="align-middle text-end">{parseFloat(values.subTotal)?.toLocaleString('en-US', {
                                                                                    style: 'decimal',
                                                                                    minimumFractionDigits: 2
                                                                                })}</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td colSpan={2} className="align-middle text-end">
                                                                                    <strong>Discount</strong>
                                                                                </td>
                                                                                <td className="align-middle text-end">{values.currency?.label ?? "-"}</td>
                                                                                <td className="align-middle text-end">{parseFloat(values.discountValue)?.toLocaleString('en-US', {
                                                                                    style: 'decimal',
                                                                                    minimumFractionDigits: 2
                                                                                })}</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td colSpan={2} className="align-middle text-end">
                                                                                    {/* <strong>Tax (+/-)</strong> */}
                                                                                    <strong>Tax</strong>
                                                                                </td>
                                                                                <td className="align-middle text-end">{values.currency?.label ?? "-"}</td>
                                                                                <td className="align-middle text-end">{parseFloat(values.taxValue)?.toLocaleString('en-US', {
                                                                                    style: 'decimal',
                                                                                    minimumFractionDigits: 2
                                                                                })}</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td colSpan={2} className="align-middle text-end">
                                                                                    <strong>VAT</strong>
                                                                                </td>
                                                                                <td className="align-middle text-end">{values.currency?.label ?? "-"}</td>
                                                                                <td className="align-middle text-end">{parseFloat(values.vatValue)?.toLocaleString('en-US', {
                                                                                    style: 'decimal',
                                                                                    minimumFractionDigits: 2
                                                                                })}</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td colSpan={2} className="align-middle text-end">
                                                                                    <strong>Net Total</strong>
                                                                                </td>
                                                                                <td className="align-middle text-end">{values.currency?.label ?? "-"}</td>
                                                                                <td className="align-middle text-end">{parseFloat(values.netTotal)?.toLocaleString('en-US', {
                                                                                    style: 'decimal',
                                                                                    minimumFractionDigits: 2
                                                                                })}</td>
                                                                            </tr>
                                                                        </tfoot>
                                                                    </>
                                                                )}
                                                            </FieldArray>
                                                        </Table>
                                                    </div>
                                                </Form>
                                            );
                                        }}
                                    </Formik>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
                <Modal isOpen={showPreview} toggle={() => setShowPreview(false)}>
                    <ModalBody className="text-center">
                        {typeof previewUrl === "string" && previewUrl.endsWith(".pdf") ? (
                            <iframe
                                src={previewUrl}
                                title="PDF Preview"
                                style={{ width: "100%", height: "500px" }}
                            />
                        ) : (
                            <img
                                src={previewUrl}
                                alt="Attachment Preview"
                                style={{ maxWidth: "100%", maxHeight: "500px" }}
                            />
                        )}
                    </ModalBody>
                </Modal>
            </div>
        </React.Fragment>
    );
};

export default CopyPurchaseRequisition