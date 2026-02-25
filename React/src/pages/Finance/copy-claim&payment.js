import React, { useState, useEffect, useRef } from "react";
import { useHistory, useNavigate, Link, useParams } from "react-router-dom";
import Select from "react-select";
import { Button, Col, Card, CardBody, Container, FormGroup, Label, Row, Table, Input, UncontrolledAlert, Modal, ModalBody } from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { Formik, Field, Form, FieldArray } from "formik";
import * as Yup from "yup";
import {
    ClaimAndPaymentGetById, DownloadFileById, GetClaimAndPaymentApplicantDetails, GetClaimAndPaymentSeqNum,
    GetClaimAndPaymentSupplierList, GetClaimAndPaymentTransactionCurrency, GetClaimCategoryData, GetPaymentMethods,
    GetClaimDepartmentData, GetClaimTypeList, GetPaymentDescriptionList, SaveClaimAndPayment, uploadFileToServer,
    GetSupplierTaxList, GetSupplierVATList, GetClaimPOList
} from "common/data/mastersapi";
import Swal from 'sweetalert2';
import { AutoComplete } from "primereact/autocomplete";
import makeAnimated from "react-select/animated";
import { RadioButton } from 'primereact/radiobutton';
import useAccess from "../../common/access/useAccess";


const animatedComponents = makeAnimated();
const formatToTwoDecimals = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "0.00";
    return num.toFixed(2);
};

const getUserDetails = () => {
    if (localStorage.getItem("authUser")) {
        const obj = JSON.parse(localStorage.getItem("authUser"))
        return obj;
    }
}
const Copyclaimpayment = () => {

    const { access, applyAccessUI } = useAccess("Claim", "Claim & Payment");

    useEffect(() => {
        if (!access.loading) {
            applyAccessUI();
        }
    }, [access, applyAccessUI]);
    const { id } = useParams();
    const claim_id = Number(id ?? 0);
    const isEditMode = !!id;
    const formikRef = useRef();
    const history = useHistory();
    const [activeTab, setActiveTab] = useState(1);
    const [branchId, setBranchId] = useState(1);
    const [orgId, setOrgId] = useState(1);
    const [activeapp, setactiveapp] = useState(1);
    const [categorySuggestions, setCategorySuggestions] = useState([]);
    const [departmentSuggestions, setDepartmentSuggestions] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [supplierSuggestions, setSupplierSuggestions] = useState([]);
    const [selectedApplicant, setSelectedApplicant] = useState(null);
    const [applicantSuggestions, setApplicantSuggestions] = useState([]);
    const [selectedCurrency, setSelectedCurrency] = useState(null);
    const [DefaultCurrency, setDefaultCurrency] = useState(null);
    const [currencySuggestions, setCurrencySuggestions] = useState([]);
    const [selectedClaimTypes, setSelectedClaimTypes] = useState([]);
    const [claimTypeSuggestions, setClaimTypeSuggestions] = useState([]);
    const [selectedDescriptions, setSelectedDescriptions] = useState([]);
    const [descriptionSuggestions, setDescriptionSuggestions] = useState([]);
    const [showPreview, setShowPreview] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");
    const [fileName, setFileName] = useState("");
    const [modeOfPaymentOptions, setModeOfPaymentOptions] = useState([]);
    const [selectedPaymentMode, setSelectedPaymentMode] = useState([]);
    const [UserData, setUserData] = useState(null);
    const [columnType, setColumnType] = useState(0);
    const [Logininfo, setLogininfo] = useState(null);

    const [taxList, setTaxList] = useState([]);
    const [vatList, setVatList] = useState([]);
    const [polist, setpolist] = useState([]);
    const [initialValues, setInitialValues] = useState({
        claimType: "",
        supplier: "",
        applicationDate: new Date().toISOString().slice(0, 10),
        claimNumber: "",
        applicant: "",
        poNumber: "",
        jobTitle: "",
        currency: "",
        modeOfPayment: "",
        modeOfPaymentId: "",
        department: "",
        costCenter: "",
        claimAmountTC: formatToTwoDecimals(),
        claimAmountIDR: "",
        hod: "",
        hod_id: "",
        totalAmount: "",
        attachment: null,
        remarks: "",
        items: [
            {
                ClaimDtlId: 0,
                claimType: "",
                description: "",
                amount: "",
                taxPerc: 0,
                taxRate: "",
                vatPerc: 0,
                vatRate: "",
                taxid: 0,
                vatid: 0,
                date: new Date().toISOString().slice(0, 10),
                purpose: "",
                PaymentDescription: "",
                IsTaxCalType: 1,
                docReference: "",
                poid: 0,
                balamt: 0
            }
        ]
    });
    const [isDisabled, setIsDisabled] = useState(false);
    const SUPPORTED_FORMATS = [
        "application/msword",               // .doc
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        "application/pdf",                  // .pdf
        "image/png",                        // .png
        "image/jpeg",                       // .jpeg, .jpg
        "application/vnd.ms-excel",        // .xls
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" // .xlsx
    ];

    const FILE_SIZE_LIMIT = 2 * 1024 * 1024; // 2MB

    const validationSchema = Yup.object().shape({
        claimType: Yup.string().required("Category Type is required"),
        // department required if claimType is "1" or "2"
        department: Yup.string().when("claimType", {
            is: (val) => val === "1" || val === "2",
            then: Yup.string().required("Department is required"),
            otherwise: Yup.string().notRequired()
        }),

        // applicant required if claimType is "1" or "2"
        applicant: Yup.string().when("claimType", {
            is: (val) => val === "1" || val === "2",
            then: Yup.string().required("Applicant is required"),
            otherwise: Yup.string().notRequired()
        }),

        // supplier required if claimType is "3"
        supplier: Yup.string().when("claimType", {
            is: "3",
            then: Yup.string().required("Supplier is required"),
            otherwise: Yup.string().notRequired()
        }),

        // poNumber required if claimType is "3"
        // poNumber: Yup.string().when("claimType", {
        //     is: "3",
        //     then: Yup.string().required("PO Number is required"),
        //     otherwise: Yup.string().notRequired()
        // }),
        hod: Yup.string().required("HOD is required"),
        currency: Yup.string().required("Currency is required"),
        modeOfPaymentId: Yup.string().required("Mode Of PaymentId is required"),


        attachment: Yup.mixed().when('$isEditMode', {
            is: false,
            then: Yup.mixed()
                .required("Attachment is required")
                .test("fileExists", "Attachment is required", value => {
                    return value && value.length > 0;
                }),
            otherwise: Yup.mixed().notRequired()
        }),
        // remarks: Yup.string().required("Remarks are required"),
        items: Yup.array().min(1, "At least one item is required")
        // items: Yup.array().of(
        //     Yup.object().shape({
        //         claimType: Yup.string().required("Required"),
        //         description: Yup.string().required("Required"),
        //         amount: Yup.number().required("Required"),
        //         date: Yup.string().required("Required"),
        //         purpose: Yup.string().required("Required")
        //     })
        // )    
    });

    const loadClaimPOList = async (id) => {
        const res = await GetClaimPOList(claim_id, branchId, orgId, id, "%");
        if (Array.isArray(res)) {
            setpolist(res);
        } else {
            setpolist([]);
        }
    };
    const mapItemsFromApi = (details, claimCategoryId) => {
        const formattedItems = [];
        const claimTypes = [];
        const descriptions = [];

        details.forEach((item) => {
            // Push the formatted item
            formattedItems.push({
                ClaimDtlId: 0,
                claimType: item.ClaimTypeId || "",
                description: item.PaymentId || "",
                amount: item.Amount || 0,
                taxRate: item.TaxRate || 0,

                vatRate: item.VatRate || 0,
                date: item.ExpenseDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
                purpose: item.Purpose || "",
                PaymentDescription: item.PaymentDescription,
                IsTaxCalType: item.IsTaxCalType,
                docReference: item.docReference || "",
                taxPerc: item.taxPerc || 0,
                vatPerc: item.vatPerc || 0,
                vatid: item.vatid || 0,
                taxid: item.taxid || 0,
                poid: item.poid || 0,
                balamt: item.balamt || 0
            });

            // Push to selectedClaimTypes array
            claimTypes.push({
                label: item.claimtype || "", // example: "General Type"
                value: item.ClaimTypeId,
                typeid: item.ClaimTypeId,
                claimtype: item.claimtype,
            });

            // Push to selectedDescriptions array
            descriptions.push({
                label: item.PaymentDescription || "",
                value: item.PaymentId,
                PaymentDescription: item.PaymentDescription,
                PaymentId: item.PaymentId
            });
        });

        return {
            items: formattedItems,
            selectedClaimTypes: claimTypes,
            selectedDescriptions: descriptions,
        };
    };

    useEffect(() => {
        const userData = getUserDetails();

        setUserData(userData);
        console.log("Login data : ", userData);

        const fetchDropdownData = async () => {
            const [catRes, deptRes, applicantdtl, cuurencydtl, supplierdtl, paymentModes, taxRes, vatRes] = await Promise.all([
                GetClaimCategoryData(claim_id, orgId, branchId, '%'),
                GetClaimDepartmentData(claim_id, orgId, branchId, '%'),
                GetClaimAndPaymentApplicantDetails(claim_id, branchId, orgId, '%'),
                GetClaimAndPaymentTransactionCurrency(claim_id, branchId, orgId, "%"),
                GetClaimAndPaymentSupplierList(claim_id, branchId, orgId, 0, "%"),
                GetPaymentMethods(1, 0),
                GetSupplierTaxList(orgId, branchId), GetSupplierVATList(orgId, branchId)

            ]);
            setCategorySuggestions(Array.isArray(catRes) ? catRes : []);
            setDepartmentSuggestions(Array.isArray(deptRes) ? deptRes : []);
            setApplicantSuggestions(Array.isArray(applicantdtl) ? applicantdtl : []);
            setCurrencySuggestions(Array.isArray(cuurencydtl) ? cuurencydtl : []);
            setSupplierSuggestions(Array.isArray(supplierdtl) ? supplierdtl : []);



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
            debugger
            const paymentOptions = Array.isArray(paymentModes) ?
                paymentModes.map((mode) => ({
                    value: mode.PaymentMethodId,
                    label: mode.PaymentMethod
                })) : [];

            setModeOfPaymentOptions(paymentOptions);

        };

        fetchDropdownData();
    }, []);



    const getClaimDetailsById = async (claimId) => {
        try {
            debugger
            const res = await ClaimAndPaymentGetById(claimId, orgId, branchId);
            if (res?.status && res?.data) {
                const header = res.data.header;

                const detailResult = mapItemsFromApi(header.ClaimCategoryId === 3 ? [] : res.data.details || [], header.ClaimCategoryId);
                fetchSeqNum();
                setSelectedCategory({
                    categoryname: header.claimcategory,
                    categoryid: header.ClaimCategoryId,
                });

                // setSelectedApplicant({
                //     username: header.applicantname,
                //     userid: header.ApplicantId,
                // });

                setSelectedCurrency({
                    Currency: header.transactioncurrency,
                    currencyid: header.TransactionCurrencyId,
                    ExchangeRate: header.ExchangeRate
                });

                setSelectedPaymentMode({
                    ModeOfPayment: header.modeOfPayment,
                    modeOfPaymentId: header.ModeOfPaymentId
                });
                setColumnType(header.docType);
                // setSelectedDepartment({
                //     departmentname: header.departmentname,
                //     departmentid: header.DepartmentId,
                // });

                if (header.SupplierId) {
                    setSelectedSupplier({
                        SupplierName: header.SupplierName,
                        SupplierId: header.SupplierId,
                    });
                }
                debugger
                console.log("initialvalues", header);
                // // Set main form values
                setInitialValues({
                    claimType: header.ClaimCategoryId ?? "",
                    supplier: header.SupplierId ?? "",
                    applicationDate: header.ApplicationDate?.slice(0, 10) ?? "",
                    claimNumber: "",
                    applicant: header.ApplicantId ?? "",
                    poNumber: header.PONo ?? "",
                    jobTitle: header.JobTitle ?? "",
                    currency: header.TransactionCurrencyId ?? "",
                    modeOfPaymentId: header.ModeOfPaymentId ?? 0,
                    modeOfPayment: header.ModeOfPayment ?? "",
                    department: header.DepartmentId ?? "",
                    costCenter: header.CostCenter ?? "",
                    claimAmountTC: formatToTwoDecimals(header.ClaimAmountInTC),
                    claimAmountIDR: formatToTwoDecimals(header.TotalAmountInIDR),
                    hod: header.HOD_Name ?? "",
                    hod_id: header.HOD ?? "",
                    totalAmount: formatToTwoDecimals(header.TotalAmountInIDR),
                    attachment: "",
                    remarks: header.Remarks ?? "",
                    items: detailResult.items,
                    docType: header.docType
                    //  userId: UserData?.u_id

                });
                setPreviewUrl("")
                setFileName("")
                setSelectedClaimTypes(detailResult.selectedClaimTypes);
                setSelectedDescriptions(detailResult.selectedDescriptions);
                var claimtypedtl = await GetClaimTypeList(claim_id, branchId, orgId, header.ClaimCategoryId, "%");
                if (Array.isArray(claimtypedtl)) {
                    setClaimTypeSuggestions(claimtypedtl);
                } else if (claimtypedtl?.status && Array.isArray(claimtypedtl.data)) {
                    setClaimTypeSuggestions(claimtypedtl.data);
                } else {
                    setClaimTypeSuggestions([]);
                }
                loadClaimPOList(header.SupplierId);

                // Load description suggestions for the first row if it has a claim type
                if (detailResult.items.length > 0 && detailResult.items[0].claimType) {
                    const firstClaimTypeId = detailResult.items[0].claimType;
                    const descRes = await GetPaymentDescriptionList(claim_id, branchId, orgId, firstClaimTypeId, "%");
                    if (Array.isArray(descRes)) {
                        setDescriptionSuggestions(descRes);
                    } else if (descRes?.status && Array.isArray(descRes.data)) {
                        setDescriptionSuggestions(descRes.data);
                    }
                }

                setEditableRows(detailResult.items.map((_, index) => index));
            }
        } catch (err) {
            console.error("Error fetching claim details", err);
        }
    };

    const fetchSeqNum = async () => {
        const userData = getUserDetails();
        const res = await GetClaimAndPaymentSeqNum(branchId, orgId, userData?.u_id);
        if (res.status) {
            const data = res.data
            setInitialValues((prev) => ({
                ...prev,
                claimNumber: data?.ClaimNo,
                applicant: data?.applicantid,
                department: data?.departmentid,
            }));
            setLogininfo(data);
            if (data.hodlogin == 0) {
                setSelectedApplicant({
                    username: data.applicantname,
                    userid: data.applicantid,
                });
                setSelectedDepartment({
                    departmentname: data.departmentname,
                    departmentid: data.departmentid,
                });
                setactiveapp(0);
            }
            console.log("currency ,", selectedCurrency);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Failed to Load Sequence Number',
                text: res.message || 'Could not fetch Claim and Payment Seq No.',
            });
        }
    };

    useEffect(() => {
        if (isEditMode) {
            getClaimDetailsById(claim_id);
        }
    }, [isEditMode, claim_id]);

    const loadCategorySuggestions = async (e) => {
        const searchText = e.query;
        const res = await GetClaimCategoryData(claim_id, branchId, orgId, searchText);
        if (res && Array.isArray(res)) {
            setCategorySuggestions(Array.isArray(res) ? res : []);
        } else {
            setCategorySuggestions([]);
        }
    };
    const loadCategory = async () => {
        const searchText = "%";
        const res = await GetClaimCategoryData(claim_id, branchId, orgId, searchText);
        if (res && Array.isArray(res)) {
            setCategorySuggestions(Array.isArray(res) ? res : []);
        } else {
            setCategorySuggestions([]);
        }
    };


    const loadDepartmentSuggestions = async (e) => {
        const searchText = e.query;
        const res = await GetClaimDepartmentData(claim_id, branchId, orgId, searchText == null || searchText == undefined ? "%" : searchText);

        if (res && Array.isArray(res)) {
            setDepartmentSuggestions(Array.isArray(res) ? res : []);
        } else {
            setDepartmentSuggestions([]);
        }
    };


    const loadSupplierSuggestions = async (e) => {
        const res = await GetClaimAndPaymentSupplierList(claim_id, branchId, orgId, selectedCategory?.categoryid, e.query);
        if (res.status && Array.isArray(res.data)) {
            setSupplierSuggestions(res.data);
        } else {
            setSupplierSuggestions([]);
        }
    };

    const loadApplicantSuggestions = async (e) => {
        const res = await GetClaimAndPaymentApplicantDetails(claim_id, branchId, orgId, e.query);
        if (res.status && Array.isArray(res.data)) {
            setApplicantSuggestions(res.data);
        } else {
            setApplicantSuggestions([]);
        }
    };

    const loadCurrencySuggestions = async (e) => {
        const res = await GetClaimAndPaymentTransactionCurrency(claim_id, branchId, orgId, e.query);
        if (res.status && Array.isArray(res.data)) {
            setCurrencySuggestions(res.data);
        } else {
            setCurrencySuggestions([]);
        }
    };

    const loadClaimTypeSuggestions = async (e, rowIndex) => {
        const res = await GetClaimTypeList(claim_id, branchId, orgId, selectedCategory?.categoryid, e.query);
        if (res.status && Array.isArray(res.data)) {
            setClaimTypeSuggestions(res.data);
        }
    };

    const loadClaimType = async (categoryid) => {
        const res = await GetClaimTypeList(claim_id, branchId, orgId, categoryid == null || categoryid == undefined ? 0 : categoryid, "%");
        if (Array.isArray(res)) {
            setClaimTypeSuggestions(res);
        } else if (res?.status && Array.isArray(res.data)) {
            setClaimTypeSuggestions(res.data);
        } else {
            setClaimTypeSuggestions([]);
        }
    };

    const loadDescriptionSuggestions = async (e, rowIndex, claimTypeId) => {
        const res = await GetPaymentDescriptionList(claim_id, branchId, orgId, claimTypeId, e.query);
        if (res.status && Array.isArray(res.data)) {
            setDescriptionSuggestions(res.data);
        }
    };

    const loadDescription = async (e, rowIndex, claimTypeId) => {
        const res = await GetPaymentDescriptionList(claim_id, branchId, orgId, claimTypeId, "%");
        if (Array.isArray(res)) {
            setDescriptionSuggestions(res);
        } else if (res?.status && Array.isArray(res.data)) {
            setDescriptionSuggestions(res.data);
        } else {
            setDescriptionSuggestions([]);
        }
    };

    // const initialValues = {
    //     claimType: "claim",
    //     applicationDate: new Date().toISOString().slice(0, 10),
    //     claimNumber: "CLM0000001",
    //     applicant: "Sandy",
    //     jobTitle: "Manager",
    //     currency: "SGD",
    //     department: "IT",
    //     costCenter: "CC001",
    //     claimAmount: "",
    //     hod: "Julie",
    //     totalAmount: "",
    //     attachment: null,
    //     remarks: "",
    //     items: []
    // };

    const AutoSetInitialItem = ({ values, setFieldValue }) => {
        useEffect(() => {
            if (values.items.length === 0 && selectedCategory) {
                const defaultItem = {
                    description:
                        selectedCategory === 1
                            ? "Business Entertainment - Meal"
                            : "Cash Advance for Entertainment (Customer)",
                    amount: 0,
                    taxRate: 0,
                    date: new Date().toISOString().slice(0, 10),
                    purpose: ""
                };
                setFieldValue("items", [defaultItem]);
            }
        }, [selectedCategory, values.items.length, setFieldValue]);
        return null;
    };

    const transformToApiPayload = (values, isSubmitted) => ({
        header: {
            claimId: Number(0 || 0),
            claimCategoryId: Number(values.claimType || 0),
            applicationDate: `${values.applicationDate}T00:00:00.000Z`,
            applicationNo: values.claimNumber,
            departmentId: values.department || 0,
            applicantId: values.applicant || 0,
            jobTitle: values.jobTitle,
            // hod: values.hod,
            hod: Number(values.hod_id || 0),
            transactionCurrencyId: values.currency || 0,
            modeOfPaymentId: values.modeOfPaymentId,
            modeOfPayment: values.modeOfPayment,
            attachmentName: "",
            attachmentPath: "",
            costCenterId: Number(values.CostCenter_id || 0),
            claimAmountInTC: Number(values.claimAmountTC),
            totalAmountInIDR: Number(values.claimAmountIDR),
            remarks: values.remarks,
            isActive: 1,
            isSubmitted: isSubmitted,
            orgId: orgId,
            branchId: branchId,
            poNo: values.poNumber || "",
            supplierId: Number(values.supplier || 0),
            userId: UserData?.u_id,
            docType: columnType == null || columnType == undefined ? 0 : columnType,
        },
        details: (values.items || []).map((item) => ({
            claimDtlId: item.ClaimDtlId,
            claimId: 0,
            claimTypeId: item.claimType,
            claimAndPaymentDesc: "",
            amount: Number(item.amount),
            taxRate: Number(item.taxRate),
            vatRate: Number(item.vatRate),
            docReference: item.docReference == null || item.docReference == undefined ? "" : item.docReference,

            totalAmount: item.IsTaxCalType == 1 ? (Number(item.amount) + (Number(item.vatRate || 0))) - Number(item.taxRate || 0) : Number(item.amount) - (Number(item.taxRate || 0)),// Number(item.amount) * (1 + Number(item.taxRate || 0)),
            expenseDate: `${item.date}T00:00:00.000Z`,
            purpose: item.purpose || "",
            paymentId: item.PaymentId || (typeof item.description === 'object' ? item.description?.value : item.description) || 0,
            taxPerc: Number(item.taxPerc || 0),
            vatPerc: Number(item.vatPerc || 0),
            taxid: Number(item.taxid || 0),
            vatid: Number(item.vatid || 0),
            PaymentDescription: item.PaymentDescription,
            poid: Number(item.poid || 0),
            IsTaxCalType: Number(item.IsTaxCalType)
        }))
    });


    const handleSubmit = async (values, isSubmitted) => {
        debugger
        let actionType = 'Save';

        if (isEditMode && !isSubmitted) {
            actionType = 'Save';
        } else if (isSubmitted) {
            actionType = 'Post';
        }

        const result = await Swal.fire({
            title: `Are you sure you want to ${actionType}?`,
            text: `This will ${actionType.toLowerCase()} the claim details.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: `Yes, ${actionType}`,
            cancelButtonText: 'Cancel',
        });

        if (!result.isConfirmed) return;
        debugger
        const payload = transformToApiPayload(values, isSubmitted);

        // console.log('payload > ',payload)
        // return;
        try {
            const res = await SaveClaimAndPayment(false, payload);

            if (res?.status === true) {
                const claimPaymentId = res?.data;

                let fileUploadSuccess = true;

                // Check if not in edit mode and file exists before uploading
                if (values.attachment?.length > 0) {
                    fileUploadSuccess = await uploadFileToServer({
                        file: values.attachment[0],
                        claimPaymentId,
                        branchId,
                        userId: UserData?.u_id,
                    });
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

        } catch (err) {
            console.error("Error Saving", err);
            Swal.fire({
                icon: 'error',
                title: 'Exception',
                text: 'An error occurred while saving.',
            });
        }
    };

    const handleCancel = () => {
        history.push('/Manageclaim&Payment')
    }

    // const [totalAmount, setTotalAmount] = useState(0);

    //  useEffect(() => {
    //     if (formikRef.current) {
    //     const values = formikRef.current.values;
    //     const total = values.items.reduce(
    //         (sum, item) => sum + Number(item.amount || 0) + Number(item.taxRate || 0),
    //         0
    //     );
    //     const claimAmountTC = total.toFixed(2);
    //     formikRef.current.setFieldValue("claimAmountTC", claimAmountTC);

    //     const exchangeRate = parseFloat(selectedCurrency?.ExchangeRate || 0);
    //     const claimAmountIDR = (total * exchangeRate).toFixed(2);
    //     formikRef.current.setFieldValue("claimAmountIDR", claimAmountIDR);

    //     setTotalAmount(total);
    //     }
    // }, [formikRef.current?.values.items, selectedCurrency]);

    const validateItems = (values) => {
        const errors = {};

        const itemErrors = values.items.map((item) => {
            const rowErrors = {};
            if (!item.claimType) rowErrors.claimType = "Claim Type is required";
            if (!item.description) rowErrors.description = "Description is required";
            if (
                item.amount === undefined ||
                item.amount === "" ||
                isNaN(item.amount)
            ) {
                rowErrors.amount = "Valid Amount is required";
            }
            if (item.taxPerc !== undefined && item.taxPerc !== "") {
                const val = parseFloat(item.taxPerc);
                if (isNaN(val) || val < 0 || val > 100) {
                    rowErrors.taxPerc = "Tax % must be between 0 and 100";
                }
            }

            if (selectedCategory?.categoryid === 3 && !item.docReference) {
                rowErrors.docReference = "PO No or Inv No is required";
            }



            if (!item.date) rowErrors.date = "Expense Date is required";
            if (!item.purpose) rowErrors.purpose = "Purpose is required";
            return Object.keys(rowErrors).length ? rowErrors : null;
        });

        if (itemErrors.some((err) => err)) {
            errors.items = itemErrors;
        }

        return errors;
    };

    const [editableRows, setEditableRows] = useState([0]);


    const handleEditRow = async (index, typeid) => {
        if (typeid != undefined && typeid != null && typeid != 0) {
            const res = await GetPaymentDescriptionList(claim_id, branchId, orgId, typeid, "%");
            if (Array.isArray(res)) {
                setDescriptionSuggestions(res);
            } else if (res?.status && Array.isArray(res.data)) {
                setDescriptionSuggestions(res.data);
            } else {
                setDescriptionSuggestions([]);
            }
            // loadDescription(null,0,typeid);
        }
        setEditableRows([index]);

        // setEditableRows((prev) => [...prev, index]);

    };

    const handleDownloadFile = async () => {
        const fileId = claim_id;
        const filePath = previewUrl;

        const fileUrl = await DownloadFileById(fileId, filePath);

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

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <Breadcrumbs title="Finance" breadcrumbItem=" Claim & Payment" />
                    <Row>
                        <Col lg="12">
                            <Card>
                                <CardBody>
                                    <Formik initialValues={initialValues} validationSchema={validationSchema} enableReinitialize={true} innerRef={formikRef} context={{ isEditMode: true }}>
                                        {({ errors, touched, values, setFieldValue, setFieldTouched }) => {
                                            // const subtotal = values.items.reduce((sum, i) => sum + Number(i.amount || 0), 0);
                                            // 🔷 Helper function to compute total per row
                                            function calculateRowTotal(amount, tax, vat, isAdd) {
                                                const amt = Number(amount || 0);
                                                const tx = Number(tax || 0);
                                                const vatv = Number(vat || 0);
                                                return isAdd ? (amt + vatv) - tx : (amt - tx);
                                            }

                                            // 🔷 Calculate totalAmount directly (outside useEffect if needed)
                                            const totalAmount = values.items.reduce(
                                                (sum, item) => {
                                                    const isAdd = item.IsTaxCalType === 1;
                                                    return sum + calculateRowTotal(item.amount, item.taxRate, item.vatRate, isAdd);
                                                },
                                                0
                                            );
                                            useEffect(() => {
                                                if (selectedCategory?.categoryid === 3) {
                                                    setFieldValue("docType", columnType); // 0 = PO, 1 = Inv

                                                    console.log(columnType);
                                                }
                                            }, [columnType]);
                                            const handleCancel = () => {
                                                history.push('/Manageclaim&Payment')
                                            }

                                            // 🔷 useEffect to update formik fields when items or currency change
                                            useEffect(() => {
                                                const claimAmountTC = values.items.reduce(
                                                    (sum, item) => {
                                                        const isAdd = item.IsTaxCalType === 1;
                                                        return sum + calculateRowTotal(item.amount, item.taxRate, item.vatRate, isAdd);
                                                    },
                                                    0
                                                ).toFixed(2);

                                                setFieldValue("claimAmountTC", formatToTwoDecimals(claimAmountTC));

                                                const exchangeRate = parseFloat(selectedCurrency?.ExchangeRate || 0);
                                                const claimAmountIDR = formatToTwoDecimals(claimAmountTC * exchangeRate);

                                                setFieldValue("claimAmountIDR", claimAmountIDR);

                                            }, [values.items, selectedCurrency]);

                                            return (
                                                <>
                                                    <Form>
                                                        {/* Row 1 */}
                                                        <div className="row align-items-center g-3 justify-content-end">
                                                            <div className="col-12 col-lg-8 col-md-8 col-sm-8">
                                                                {/* {Object.keys(errors).length > 0 && (
                                                                    <div className="alert alert-danger alert-new">
                                                                        <ul className="mb-0">
                                                                            <li>{Object.entries(errors)[0][1]}</li>
                                                                        </ul>
                                                                    </div>
                                                                )} */}
                                                                {Object.keys(errors).length > 0 && (
                                                                    <div className="alert alert-danger alert-new">
                                                                        <ul className="mb-0">
                                                                            {(() => {
                                                                                // 1. Handle array field (items)
                                                                                if (Array.isArray(errors.items)) {
                                                                                    for (let index = 0; index < errors.items.length; index++) {
                                                                                        const itemError = errors.items[index];
                                                                                        if (itemError && typeof itemError === "object") {
                                                                                            const [field, message] = Object.entries(itemError)[0] || [];
                                                                                            if (field && message) {
                                                                                                return (
                                                                                                    <li key={`items-${index}-${field}`}>
                                                                                                        <strong>Row {index + 1}</strong>: {message}
                                                                                                    </li>
                                                                                                );
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }

                                                                                // 2. Handle top-level errors
                                                                                const nonItemErrors = Object.entries(errors).filter(([key]) => key !== "items");
                                                                                if (nonItemErrors.length > 0) {
                                                                                    const [field, message] = nonItemErrors[0];
                                                                                    return (
                                                                                        <li key={`error-${field}`}>
                                                                                            {message}
                                                                                        </li>
                                                                                    );
                                                                                }

                                                                                return null;
                                                                            })()}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="col-12 col-lg-4 col-md-4 col-sm-4 button-items">
                                                                <button type="button" className="btn btn-danger fa-pull-right" onClick={handleCancel}>
                                                                    <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>Close
                                                                </button>
                                                                <button type="button" data-access="post" className="btn btn-success fa-pull-right"
                                                                    onClick={async () => {
                                                                        const formikErrors = await formikRef.current.validateForm();
                                                                        const customErrors = validateItems(formikRef.current.values);

                                                                        const allErrors = { ...formikErrors, ...customErrors };

                                                                        if (Object.keys(allErrors).length === 0) {
                                                                            handleSubmit(formikRef.current.values, 1); // Post
                                                                        } else {
                                                                            formikRef.current.setErrors(allErrors);
                                                                        }
                                                                    }}
                                                                >
                                                                    <i className="bx bxs-save label-icon font-size-16 align-middle me-2"></i>Post
                                                                </button>
                                                                <button type="button" data-access="save" className="btn btn-info fa-pull-right"
                                                                    onClick={async () => {
                                                                        const formikErrors = await formikRef.current.validateForm();
                                                                        const customErrors = validateItems(formikRef.current.values);

                                                                        const allErrors = { ...formikErrors, ...customErrors };

                                                                        if (Object.keys(allErrors).length === 0) {
                                                                            handleSubmit(formikRef.current.values, 0); // Save
                                                                        } else {
                                                                            formikRef.current.setErrors(allErrors);
                                                                        }
                                                                    }}
                                                                >
                                                                    <i className="bx bx-comment-check label-icon font-size-16 align-middle me-2" ></i>{isEditMode ? "Save" : "Save"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <Row>
                                                            <Col md={4}>
                                                                <Label for="claimType">Category Type <span className="text-danger">*</span></Label>
                                                                {/* <AutoComplete
                                                                    value={selectedCategory}
                                                                    suggestions={categorySuggestions}
                                                                    completeMethod={loadCategorySuggestions}
                                                                    field="categoryname"
                                                                    onChange={(e) => {
                                                                        setSelectedCategory(e.value);
                                                                        setFieldValue("claimType",e.value?.categoryid)
                                                                    }}
                                                                    placeholder="Search Category"
                                                                    style={{ width: '100%' }}
                                                                    className={`my-autocomplete`}
                                                                /> */}

                                                                <Select
                                                                    name="claimType"
                                                                    id="claimType"
                                                                    options={Array.isArray(categorySuggestions) ? categorySuggestions.map(category => ({
                                                                        value: category.categoryid,
                                                                        label: category.categoryname,
                                                                        categoryid: category.categoryid,
                                                                        categoryname: category.categoryname,
                                                                    })) : []}
                                                                    value={Array.isArray(categorySuggestions) ? categorySuggestions.find((option) => option.categoryid === selectedCategory?.categoryid) || null : null}
                                                                    onChange={(option) => {
                                                                        console.log("Selected option:", option); // Debugging

                                                                        setSelectedCategory(option);
                                                                        setFieldValue("claimType", option?.value);

                                                                        values.items.forEach((_, i) => {
                                                                            setFieldValue(`items[${i}].claimType`, "");
                                                                            setFieldValue(`items[${i}].description`, "");
                                                                            setFieldValue(`items[${i}].PaymentDescription`, "");

                                                                            setFieldValue(`items[${i}].taxRate`, 0);
                                                                            setFieldValue(`items[${i}].taxPerc`, 0);
                                                                        });

                                                                        setFieldValue("jobTitle", option?.value != 3 ? "" : "N/A");
                                                                        setClaimTypeSuggestions([]);
                                                                        if (option?.value === 3) {
                                                                            setSelectedCurrency({});
                                                                            setFieldValue("currency", "");
                                                                            setFieldValue("claimAmountIDR", "");

                                                                            // setFieldValue("applicant", 0);
                                                                            // setFieldValue("department", 0);
                                                                            // setSelectedApplicant({
                                                                            //     username: "",
                                                                            //     userid: 0,
                                                                            // });
                                                                            // setSelectedDepartment({
                                                                            //     departmentname: "",
                                                                            //     departmentid: 0,
                                                                            // });


                                                                            if (Logininfo.hodlogin == 0) {

                                                                                setSelectedApplicant({
                                                                                    username: Logininfo.applicantname,
                                                                                    userid: Logininfo.applicantid,
                                                                                });

                                                                                setSelectedDepartment({
                                                                                    departmentname: Logininfo.departmentname,
                                                                                    departmentid: Logininfo.departmentid,
                                                                                });
                                                                                setactiveapp(0);
                                                                                setFieldValue("applicant", Logininfo.applicantid);
                                                                                setFieldValue("department", Logininfo.departmentid);
                                                                            }
                                                                            setactiveapp(0);
                                                                        }
                                                                        else {
                                                                            setSelectedCurrency(DefaultCurrency);


                                                                            if (Logininfo.hodlogin == 0) {

                                                                                setSelectedApplicant({
                                                                                    username: Logininfo.applicantname,
                                                                                    userid: Logininfo.applicantid,
                                                                                });

                                                                                setSelectedDepartment({
                                                                                    departmentname: Logininfo.departmentname,
                                                                                    departmentid: Logininfo.departmentid,
                                                                                });
                                                                                setactiveapp(0);
                                                                                setFieldValue("applicant", Logininfo.applicantid);
                                                                                setFieldValue("department", Logininfo.departmentid);
                                                                            } else {
                                                                                setactiveapp(1);
                                                                            }

                                                                            setFieldValue("currency", DefaultCurrency?.currencyid || "");
                                                                            setFieldValue("claimAmountIDR", DefaultCurrency?.ExchangeRate || "");
                                                                        }
                                                                        loadClaimType(option?.value);
                                                                    }}
                                                                    classNamePrefix="select"
                                                                    isDisabled={false}

                                                                    isClearable={true}

                                                                    isSearchable={true}

                                                                    components={animatedComponents}
                                                                    placeholder="Select Category"
                                                                />
                                                            </Col>
                                                            <Col md={4}>
                                                                <Label for="applicationDate">Application Date</Label>
                                                                <Field name="applicationDate" type="date" className="form-control" />
                                                            </Col>
                                                            <Col md={4}>
                                                                <Label for="claimNumber">Claim Application No</Label>
                                                                <Field name="claimNumber" className="form-control" disabled />
                                                            </Col>
                                                        </Row>

                                                        {/* Row 2 */}
                                                        <Row>
                                                            {selectedCategory?.categoryid === 3 && (
                                                                <>
                                                                    <Col md={4}>
                                                                        <Label for="supplier">Supplier <span className="text-danger">*</span></Label>

                                                                        <Select
                                                                            name="supplierid"
                                                                            id="supplierid"
                                                                            options={Array.isArray(supplierSuggestions) ? supplierSuggestions.map(category => ({
                                                                                value: category.SupplierId,
                                                                                label: category.SupplierName,
                                                                                SupplierId: category.SupplierId,
                                                                                SupplierName: category.SupplierName,

                                                                            })) : []}
                                                                            value={Array.isArray(supplierSuggestions) ? supplierSuggestions.find((option) => option.SupplierId === selectedSupplier?.SupplierId) || null : null}
                                                                            onChange={(option) => {
                                                                                loadClaimPOList(option?.SupplierId);
                                                                                setSelectedSupplier(option);
                                                                                setFieldValue("supplier", option?.SupplierId)
                                                                            }}
                                                                            classNamePrefix="select"
                                                                            isDisabled={false}

                                                                            isClearable={true}

                                                                            isSearchable={true}

                                                                            components={animatedComponents}
                                                                            placeholder="Select Supplier"
                                                                        />
                                                                        {/*                                                                         
                                                                        <AutoComplete
                                                                            value={selectedSupplier}
                                                                            suggestions={supplierSuggestions}
                                                                            completeMethod={loadSupplierSuggestions}
                                                                            field="SupplierName"
                                                                            onChange={(e) => {
                                                                                setSelectedSupplier(e.value);
                                                                                setFieldValue("supplier",e.value?.SupplierId)
                                                                            }}
                                                                            placeholder="Search Supplier"
                                                                            style={{ width: '100%' }}
                                                                            className={`my-autocomplete`}
                                                                        /> */}
                                                                    </Col>
                                                                    {/* <Col md={4}>
                                                                        <Label for="poNumber">PO / Inv No. <span className="text-danger">*</span></Label>
                                                                        <Field name="poNumber" className="form-control" />
                                                                    </Col> */}
                                                                </>
                                                            )}
                                                            {(selectedCategory?.categoryid === 1 || selectedCategory?.categoryid === 2) && (
                                                                <>
                                                                    <Col md={4}>
                                                                        <Label for="department">Department <span className="text-danger">*</span></Label>
                                                                        <Select
                                                                            name="departmentid"
                                                                            id="claimdepartmentidType"
                                                                            options={Array.isArray(departmentSuggestions) ? departmentSuggestions.map(category => ({
                                                                                value: category.departmentid,
                                                                                label: category.departmentname,
                                                                                departmentid: category.departmentid,
                                                                                departmentname: category.departmentname,

                                                                            })) : []}
                                                                            value={Array.isArray(departmentSuggestions) ? departmentSuggestions.find((option) => option.departmentid === selectedDepartment?.departmentid) || null : null}
                                                                            onChange={(option) => {
                                                                                setSelectedDepartment(option);
                                                                                setFieldValue("department", option.departmentid)
                                                                            }}
                                                                            classNamePrefix="select"
                                                                            isDisabled={activeapp == 0}
                                                                            isClearable={true}

                                                                            isSearchable={true}

                                                                            components={animatedComponents}
                                                                            placeholder="Select Department"
                                                                        />

                                                                        {/* <AutoComplete
                                                                            value={selectedDepartment}
                                                                            suggestions={departmentSuggestions}
                                                                            completeMethod={loadDepartmentSuggestions}
                                                                            field="departmentname"
                                                                            onChange={(e) => {
                                                                                setSelectedDepartment(e.value);
                                                                                setFieldValue("department",e.value?.departmentid)
                                                                            }}
                                                                            placeholder="Search Department"
                                                                            style={{ width: '100%' }}
                                                                            className={`my-autocomplete`}
                                                                              
                                                                        /> */}
                                                                    </Col>
                                                                    <Col md={4}>
                                                                        <Label for="applicant">Applicant <span className="text-danger">*</span></Label>


                                                                        <Select
                                                                            name="applicantid"
                                                                            id="applicantid"
                                                                            options={Array.isArray(applicantSuggestions) ? applicantSuggestions.map(category => ({
                                                                                value: category.userid,
                                                                                label: category.username,
                                                                                userid: category.userid,
                                                                                username: category.username,
                                                                                jobtitle: category.jobtitle
                                                                            })) : []}
                                                                            value={Array.isArray(applicantSuggestions) ? applicantSuggestions.find((option) => option.userid === selectedApplicant?.userid) || null : null}
                                                                            onChange={(option) => {
                                                                                const selected = option;
                                                                                setSelectedApplicant(selected);

                                                                                setFieldValue("applicant", selected?.userid || "");
                                                                                setFieldValue("jobTitle", selected?.jobtitle || "");
                                                                            }}
                                                                            classNamePrefix="select"
                                                                            isDisabled={activeapp == 0}

                                                                            isClearable={true}

                                                                            isSearchable={true}

                                                                            components={animatedComponents}
                                                                            placeholder="Select Applicant"
                                                                        />

                                                                        {/* <AutoComplete
                                                                            value={selectedApplicant}
                                                                            suggestions={applicantSuggestions}
                                                                            completeMethod={loadApplicantSuggestions}
                                                                            field="username"
                                                                            // onChange={(e) => setSelectedApplicant(e.value)}
                                                                            onChange={(e) => {
                                                                                const selected = e.value;
                                                                                setSelectedApplicant(selected);

                                                                                setFieldValue("applicant", selected?.userid || "");
                                                                                setFieldValue("jobTitle", selected?.jobtitle || "");
                                                                            }}
                                                                            placeholder="Search Applicant"
                                                                            style={{ width: '100%' }}
                                                                            className={`my-autocomplete`}
                                                                        /> */}
                                                                    </Col>
                                                                </>
                                                            )}

                                                            <Col md={4}>
                                                                <Label for="jobTitle">Job Title</Label>
                                                                <Field name="jobTitle" className="form-control" disabled="true" />
                                                                {/* disabled={selectedCategory?.categoryid !== 3} */}
                                                            </Col>

                                                            {selectedCategory?.categoryid === 3 && (
                                                                <Col md={4}>
                                                                    <div className="mb-3">
                                                                        <Label for="SupplierSource"></Label>
                                                                        <div>
                                                                            <div className="form-check form-check-inline">
                                                                                <input
                                                                                    type="radio"
                                                                                    id="po"
                                                                                    name="columnToggle"
                                                                                    value={0}
                                                                                    className="form-check-input"
                                                                                    checked={columnType === 0}
                                                                                    onChange={() => {
                                                                                        setColumnType(0);
                                                                                        values.items.forEach((_, i) => {
                                                                                            setFieldValue(`items[${i}].poid`, 0);
                                                                                            setFieldValue(`items[${i}].docReference`, "");
                                                                                            setFieldValue(`items[${i}].amount`, 0);
                                                                                            loadClaimPOList(selectedSupplier?.SupplierId);
                                                                                        });
                                                                                    }}
                                                                                />
                                                                                <label htmlFor="po" className="form-check-label">PO</label>
                                                                            </div>
                                                                            <div className="form-check form-check-inline">
                                                                                <input
                                                                                    type="radio"
                                                                                    id="inv"
                                                                                    name="columnToggle"
                                                                                    value={1}
                                                                                    className="form-check-input"
                                                                                    checked={columnType === 1}
                                                                                    onChange={() => {
                                                                                        setColumnType(1);
                                                                                        values.items.forEach((_, i) => {
                                                                                            setFieldValue(`items[${i}].poid`, 0);
                                                                                            setFieldValue(`items[${i}].docReference`, "");
                                                                                            setFieldValue(`items[${i}].amount`, 0);
                                                                                            loadClaimPOList(selectedSupplier?.SupplierId);
                                                                                        });
                                                                                    }}
                                                                                />
                                                                                <label htmlFor="inv" className="form-check-label">Inv No</label>
                                                                            </div></div>
                                                                    </div>
                                                                </Col>
                                                            )}


                                                        </Row>

                                                        {/* Row 3 */}
                                                        <Row>
                                                            <Col md={4}>
                                                                <Label for="hod">Head of Department</Label>
                                                                <Field name="hod" className="form-control" disabled />
                                                            </Col>
                                                            <Col md={4}>
                                                                <Label for="currency">Transaction Currency <span className="text-danger">*</span></Label>

                                                                <Select
                                                                    name="currencyid"
                                                                    id="currencyid"
                                                                    options={Array.isArray(currencySuggestions) ? currencySuggestions.map(category => ({
                                                                        value: category.currencyid,
                                                                        label: category.Currency,
                                                                        currencyid: category.currencyid,
                                                                        Currency: category.Currency,
                                                                        ExchangeRate: category.ExchangeRate
                                                                    })) : []}
                                                                    value={Array.isArray(currencySuggestions) ? currencySuggestions.find((option) => option.currencyid === selectedCurrency?.currencyid) || null : null}
                                                                    onChange={(option) => {
                                                                        const selected = option;
                                                                        setSelectedCurrency(selected);

                                                                        setFieldValue("currency", selected?.currencyid || "");
                                                                        setFieldValue("claimAmountIDR", selected?.ExchangeRate || "");
                                                                    }}
                                                                    classNamePrefix="select"
                                                                    isDisabled={false}

                                                                    isClearable={true}

                                                                    isSearchable={true}

                                                                    components={animatedComponents}
                                                                    placeholder="Select Transaction Currency"
                                                                />


                                                                {/* <AutoComplete
                                                                    value={selectedCurrency}
                                                                    suggestions={currencySuggestions}
                                                                    completeMethod={loadCurrencySuggestions}
                                                                    field="Currency"
                                                                    // onChange={(e) => setSelectedCurrency(e.value)}
                                                                    onChange={(e) => {
                                                                        const selected = e.value;
                                                                        setSelectedCurrency(selected);

                                                                        setFieldValue("currency", selected?.currencyid || "");
                                                                        setFieldValue("claimAmountIDR", selected?.ExchangeRate || "");
                                                                    }}
                                                                    placeholder="Search Currency"
                                                                    style={{ width: '100%' }}
                                                                    className={`my-autocomplete`}
                                                                /> */}
                                                            </Col>
                                                            <Col md={4}>
                                                                <Row className="align-items-center">
                                                                    {/* File Input */}
                                                                    <Col xs={isEditMode && previewUrl ? 6 : 12}>
                                                                        <Label htmlFor="attachment">
                                                                            Attachment
                                                                        </Label>
                                                                        <input
                                                                            type="file"
                                                                            name="attachment"
                                                                            className="form-control"
                                                                            accept=".jpg,.jpeg,.png,.pdf"

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
                                                                    </Col>

                                                                    {/* Preview Button */}
                                                                    {isEditMode && previewUrl && (
                                                                        <Col xs={6} className="pt-1 text-align-right">
                                                                            <button
                                                                                type="button"
                                                                                className="btn d-flex align-items-center justify-content-between"
                                                                                onClick={handleDownloadFile}
                                                                                style={{
                                                                                    maxWidth: "100%", // limit width
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
                                                                                    title={fileName} // tooltip for full name
                                                                                >
                                                                                    {fileName}
                                                                                </span>
                                                                                <i className="mdi mdi-cloud-download mdi-24px text-primary ms-2"></i>
                                                                            </button>
                                                                        </Col>
                                                                    )}

                                                                </Row>
                                                            </Col>
                                                        </Row>

                                                        {/* Row 4 */}
                                                        <Row>
                                                            {/* <Col md={4}>
                                                                <Label for="costCenter">Cost Center </Label>
                                                                <Field name="costCenter" className="form-control" disabled />
                                                            </Col> */}
                                                            {access.canViewRate && (
                                                                <Col md={4}>
                                                                    <Label for="claimAmountTC">Claim Amount in TC </Label>
                                                                    {/* <Field name="claimAmountTC" className="form-control " disabled /> */}
                                                                    <Field name="claimAmountTC" disabled>
                                                                        {({ field }) => {
                                                                            const formatWithCommas = (value) => {
                                                                                if (value === undefined || value === null || value === '') return '';
                                                                                const [intPart, decPart] = value.toString().split('.');
                                                                                const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                                                                // Keep up to 6 decimals
                                                                                return decPart !== undefined
                                                                                    ? `${intFormatted}.${decPart.slice(0, 2)}`
                                                                                    : intFormatted;
                                                                            };

                                                                            return (
                                                                                <input
                                                                                    {...field}
                                                                                    disabled
                                                                                    className="form-control"
                                                                                    value={formatWithCommas(field.value)}
                                                                                />
                                                                            );
                                                                        }}
                                                                    </Field>


                                                                </Col>
                                                            )}
                                                            {/* ✅ Mode of Payment */}
                                                            <Col md={4}>
                                                                <Label for="modeOfPayment">Mode Of Payment<span className="text-danger">*</span> </Label>
                                                                <Select name="modeOfPayment" id="modeOfPayment"
                                                                    options={modeOfPaymentOptions}
                                                                    value={modeOfPaymentOptions.find(
                                                                        (option) => option.value === values.modeOfPaymentId) || null
                                                                    }
                                                                    placeholder="Select"
                                                                    onChange={(selectedOption) => {
                                                                        setFieldValue("modeOfPaymentId", selectedOption?.value || 0);
                                                                        setFieldValue("modeOfPayment", selectedOption?.label || "");

                                                                    }}
                                                                />
                                                            </Col>
                                                        </Row>

                                                        {/* Row 5 */}
                                                        {/* <Row>
                                                            <Col md={12}>
                                                                <Label for="remarks">Remarks <span className="text-danger">*</span></Label>
                                                                <Field as="textarea" name="remarks" rows={3} className="form-control" />
                                                            </Col>
                                                        </Row> */}
                                                        <br />

                                                        {selectedCategory && (
                                                            <FieldArray name="items">
                                                                {({ push, remove }) => (
                                                                    <div style={{ overflowX: "auto" }}>

                                                                        <Table className="ClaimTable" style={{ minWidth: selectedCategory?.categoryid === 3 ? "2800px" : "1600px" }} bordered>
                                                                            <thead style={{ backgroundColor: "#3e90e2", color: "#fff", textAlign: "center" }}>
                                                                                <tr>
                                                                                    <th width="2%"><button
                                                                                        type="button"
                                                                                        style={{ padding: "0.1rem 0.3rem", fontSize: "0.7rem", lineHeight: "1" }}
                                                                                        className="btn btn-primary"
                                                                                        onClick={() => {
                                                                                            push({
                                                                                                ClaimDtlId: 0,
                                                                                                claimType: "",
                                                                                                description: "",
                                                                                                amount: "",        // Keep it empty string so Yup handles it properly
                                                                                                taxRate: "",       // Optional, keep empty
                                                                                                vatRate: "",
                                                                                                date: new Date().toISOString().slice(0, 10),
                                                                                                purpose: "",
                                                                                                PaymentDescription: "",
                                                                                                IsTaxCalType: 1,
                                                                                                TaxPerc: 0,
                                                                                                VatPerc: 0,
                                                                                                taxid: 0,
                                                                                                vatid: 0
                                                                                            });
                                                                                            setEditableRows([values.items.length]);

                                                                                        }


                                                                                        }
                                                                                    >
                                                                                        <i className="bx bx-plus label-icon font-size-16 align-middle"></i>
                                                                                    </button></th>
                                                                                    {selectedCategory?.categoryid === 3 && (
                                                                                        <th className="text-center required-label" width="8%" >{columnType === 0 ? "PO No" : "Inv No"}</th>
                                                                                    )}

                                                                                    <th className="text-center required-label" width={{ minWidth: (selectedCategory?.categoryid === 3 && 1 === 0) ? "12%" : "15%" }} >Claim Type</th>
                                                                                    <th className="text-center required-label" width={{ minWidth: (selectedCategory?.categoryid === 3 && 1 === 0) ? "10%" : "15%" }} >Claim & Payment Description</th>
                                                                                    {access.canViewRate && (
                                                                                        <th className="text-center required-label" width={{ minWidth: (selectedCategory?.categoryid === 3 && 1 === 0) ? "8%" : "15%" }}>Amount</th>
                                                                                    )}
                                                                                    {(selectedCategory?.categoryid === 3 && 1 === 0) && (
                                                                                        <th width="6%" >Tax</th>  // Add before Tax Rate

                                                                                    )}
                                                                                    {(selectedCategory?.categoryid === 3 && 1 === 0) && (
                                                                                        <th width="5%" >Tax %</th>  // Add before Tax Rate

                                                                                    )}
                                                                                    {(selectedCategory?.categoryid === 3 && 1 === 0) && (
                                                                                        <th width="5%" >Tax Rate</th>
                                                                                    )}

                                                                                    {(selectedCategory?.categoryid === 3 && 1 === 0) && (
                                                                                        <th width="6%" >Vat</th>  // Add before Tax Rate

                                                                                    )}
                                                                                    {(selectedCategory?.categoryid === 3 && 1 === 0) && (
                                                                                        <th width="5%" >Vat %</th>  // Add before Tax Rate

                                                                                    )}
                                                                                    {(selectedCategory?.categoryid === 3 && 1 === 0) && (
                                                                                        <th width="5%" >Vat Rate</th>
                                                                                    )}

                                                                                    {/* {selectedCategory?.categoryid === 3 && (
                                                                              <th width="7%" className="text-center required-label">Tax +/-</th>
                                                                                   )} */}
                                                                                    {(selectedCategory?.categoryid === 3 && 1 === 0) && (
                                                                                        <th width="150px">Total Amount</th>
                                                                                    )}


                                                                                    <th className="text-center required-label" width="6%">Expense Date</th>
                                                                                    <th className="text-center required-label" >Purpose</th>
                                                                                    <th>Actions</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {(values.items || []).map((item, i) => {
                                                                                    const isEditable = editableRows.includes(i);

                                                                                    return (
                                                                                        <tr key={i}>
                                                                                            <td className="text-center">{i + 1}</td>

                                                                                            {/* {selectedCategory?.categoryid === 3 && (
  <td>
    <Field
      name={`items[${i}].docReference`}
      type="text"
      className="form-control"
      disabled={!isEditable}
    />
  </td>
)} */}
                                                                                            {selectedCategory?.categoryid === 3 && (
                                                                                                columnType === 0 ? (
                                                                                                    <td>
                                                                                                        <Select
                                                                                                            name={`items[${i}].poid`}

                                                                                                            //   options={polist}
                                                                                                            options={polist.filter(
                                                                                                                opt =>
                                                                                                                    !values.items.some(
                                                                                                                        (item, idx) => idx !== i && item.poid === opt.value
                                                                                                                    )
                                                                                                            )}

                                                                                                            value={
                                                                                                                polist.find(opt => opt.value === values.items[i].poid) || null
                                                                                                            }
                                                                                                            onChange={(option) => {

                                                                                                                setFieldValue(`items[${i}].poid`, option?.value || "");
                                                                                                                setFieldValue(`items[${i}].docReference`, option?.label || "");

                                                                                                                setFieldValue(`items[${i}].balamt`, option?.amt || 0); // store balance in form

                                                                                                            }}

                                                                                                            classNamePrefix="select"
                                                                                                            isClearable
                                                                                                            isDisabled={!isEditable}
                                                                                                            placeholder="Select PO No"
                                                                                                            menuPortalTarget={document.body}
                                                                                                        />
                                                                                                        {errors.items?.[i]?.docReference && (
                                                                                                            <div className="text-danger small">
                                                                                                                {errors.items[i].docReference}
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </td>
                                                                                                ) : (
                                                                                                    <td>
                                                                                                        <Field
                                                                                                            name={`items[${i}].docReference`}
                                                                                                            type="text"
                                                                                                            className="form-control"
                                                                                                            disabled={!isEditable}
                                                                                                        />
                                                                                                        {errors.items?.[i]?.docReference && (
                                                                                                            <div className="text-danger small">
                                                                                                                {errors.items[i].docReference}
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </td>
                                                                                                )
                                                                                            )}
                                                                                            <td >


                                                                                                <Select
                                                                                                    key={`claim-type-${i}-${claimTypeSuggestions?.length || 0}`}
                                                                                                    name="claimType"
                                                                                                    id="claimType"
                                                                                                    options={(claimTypeSuggestions || []).map(category => ({
                                                                                                        value: category.typeid,
                                                                                                        label: category.claimtype,
                                                                                                        typeid: category.typeid,
                                                                                                        claimtype: category.claimtype,
                                                                                                        typename: category.typename,
                                                                                                    }))}
                                                                                                    value={
                                                                                                        ((claimTypeSuggestions || []).map(category => ({
                                                                                                            value: category.typeid,
                                                                                                            label: category.claimtype,
                                                                                                            typeid: category.typeid,
                                                                                                            claimtype: category.claimtype,
                                                                                                            typename: category.typename,
                                                                                                        })) || []).find(option => option.value === item?.claimType) || null
                                                                                                    }
                                                                                                    onChange={(option) => {
                                                                                                        const newSelection = [...selectedClaimTypes];
                                                                                                        newSelection[i] = option;

                                                                                                        setDescriptionSuggestions([]);
                                                                                                        setSelectedDescriptions("");
                                                                                                        setFieldValue(`items[${i}].description`, "");
                                                                                                        setFieldValue(`items[${i}].PaymentDescription`, "");

                                                                                                        setSelectedClaimTypes(newSelection);
                                                                                                        setFieldValue(`items[${i}].claimType`, option?.typeid || "");
                                                                                                        console.log(item?.claimType, claimTypeSuggestions);
                                                                                                        loadDescription(option, i, option?.typeid)
                                                                                                    }}

                                                                                                    classNamePrefix="select"
                                                                                                    isDisabled={!isEditable}

                                                                                                    isClearable={true}

                                                                                                    isSearchable={true}

                                                                                                    components={animatedComponents}
                                                                                                    placeholder="Select Claim Type"
                                                                                                    menuPortalTarget={document.body} // portal the dropdown outside the table
                                                                                                />
                                                                                                {/* 
                                                                                    <AutoComplete
                                                                                        value={selectedClaimTypes[i] || null}
                                                                                        suggestions={claimTypeSuggestions}
                                                                                        completeMethod={(e) => loadClaimTypeSuggestions(e, i)}
                                                                                        field="claimtype"
                                                                                        onChange={(e) => {
                                                                                            const newSelection = [...selectedClaimTypes];
                                                                                            newSelection[i] = e.value;
                                                                                            setSelectedClaimTypes(newSelection);
                                                                                            setFieldValue(`items[${i}].claimType`, e.value?.typeid || "");
                                                                                        }}
                                                                                        placeholder="Claim Type"
                                                                                        style={{ width: '100%' }}
                                                                                        className={`my-autocomplete`}
                                                                                         disabled={!isEditable}
                                                                                    /> */}
                                                                                                {errors.items?.[i]?.claimType && (
                                                                                                    <div className="text-danger small">{errors.items[i].claimType}</div>
                                                                                                )}
                                                                                            </td>

                                                                                            <td>
                                                                                                {!isEditable ? (
                                                                                                    <Input type="text" disabled={true} value={item.PaymentDescription} />
                                                                                                    // <span>{ item.PaymentDescription}</span>



                                                                                                ) : (

                                                                                                    <Select
                                                                                                        name="paymentdescription"
                                                                                                        id="paymentdescription"
                                                                                                        options={Array.isArray(descriptionSuggestions) ? descriptionSuggestions?.map(category => ({
                                                                                                            value: category.PaymentId,
                                                                                                            label: category.PaymentDescription,
                                                                                                            PaymentId: category.PaymentId,
                                                                                                            PaymentDescription: category.PaymentDescription,

                                                                                                        })) : []
                                                                                                        }
                                                                                                        menuPortalTarget={document.body}
                                                                                                        value={
                                                                                                            (Array.isArray(descriptionSuggestions) ? descriptionSuggestions?.map(category => ({
                                                                                                                value: category.PaymentId,
                                                                                                                label: category.PaymentDescription,
                                                                                                                PaymentId: category.PaymentId,
                                                                                                                PaymentDescription: category.PaymentDescription,
                                                                                                            })) : []).find(option => option.value === item?.description) || null
                                                                                                        }
                                                                                                        onChange={(option) => {
                                                                                                            const newSelection = [...selectedDescriptions];
                                                                                                            newSelection[i] = option;
                                                                                                            setSelectedDescriptions(newSelection);
                                                                                                            setFieldValue(`items[${i}].description`, option?.PaymentId || "");
                                                                                                            setFieldValue(`items[${i}].PaymentDescription`, option?.PaymentDescription || "");

                                                                                                        }}
                                                                                                        classNamePrefix="select" isDisabled={!isEditable} isClearable={true} isSearchable={true} components={animatedComponents}
                                                                                                        placeholder="Select Payment Desc"
                                                                                                    />)}

                                                                                                {/* <AutoComplete
                                                                                        value={selectedDescriptions[i] || null}
                                                                                        suggestions={descriptionSuggestions}
                                                                                        completeMethod={(e) => loadDescriptionSuggestions(e, i, values.items[i].claimType)}
                                                                                        field="PaymentDescription"
                                                                                        onChange={(e) => {
                                                                                            const newSelection = [...selectedDescriptions];
                                                                                            newSelection[i] = e.value;
                                                                                            setSelectedDescriptions(newSelection);
                                                                                            setFieldValue(`items[${i}].description`, e.value?.PaymentId || "");
                                                                                        }}
                                                                                        placeholder="Description"
                                                                                        style={{ width: '100%' }}
                                                                                        className={`my-autocomplete`}
                                                                                        disabled={!isEditable}
                                                                                    /> */}
                                                                                                {errors.items?.[i]?.description && (
                                                                                                    <div className="text-danger small">{errors.items[i].description}</div>
                                                                                                )}
                                                                                            </td>
                                                                                            {access.canViewRate && (
                                                                                                <td>
                                                                                                    {/* <Field
                                                                                                name={`items[${i}].amount`}
                                                                                                className={`form-control ${errors?.items?.[i]?.amount && touched?.items?.[i]?.amount ? "is-invalid" : ""}`}
                                                                                                type="number"
                                                                                                step="0.01"
                                                                                                title="Amount"
                                                                                                disabled={!isEditable}
  
                                                                                                onChange={(e) => {
                                                                                                    const amount = parseFloat(e.target.value) || 0;
                                                                                                    setFieldValue(`items[${i}].amount`, amount);
                                                                                                  
                                                                                                   
                                                                                                    const taxPerc = parseFloat(values.items[i].taxPerc || 0);
                                                                                                    const taxRate = (amount * taxPerc) / 100;
                                                                                                    setFieldValue(`items[${i}].taxRate`, taxRate.toFixed(2));
                                                                                                  }}
                                                                                           />  */}
                                                                                                    <Field name={`items[${i}].amount`}>
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
                                                                                                                    className={`form-control text-end ${errors?.items?.[i]?.amount && touched?.items?.[i]?.amount
                                                                                                                        ? 'is-invalid'
                                                                                                                        : ''
                                                                                                                        }`}
                                                                                                                    disabled={!isEditable}
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



                                                                                                                        if (selectedCategory?.categoryid === 3 && columnType === 0) {

                                                                                                                            const enteredValue = parseFloat(plainValue) || 0;
                                                                                                                            const balance = parseFloat(values.items[i].balamt || 0);

                                                                                                                            // ✅ Check if entered amount > available balance
                                                                                                                            if (enteredValue > balance) {
                                                                                                                                Swal.fire({
                                                                                                                                    icon: 'error',
                                                                                                                                    title: 'Advance Payment',
                                                                                                                                    text: `Amount cannot exceed available balance: ${balance}`,
                                                                                                                                });


                                                                                                                                plainValue = balance.toFixed(2);
                                                                                                                            }
                                                                                                                        }
                                                                                                                        setFieldValue(`items[${i}].amount`, plainValue);

                                                                                                                        // Recalculate taxRate
                                                                                                                        const amountNum = parseFloat(plainValue) || 0;
                                                                                                                        const taxPerc = parseFloat(values.items[i].taxPerc || 0);
                                                                                                                        const taxRate = (amountNum * taxPerc) / 100;
                                                                                                                        setFieldValue(`items[${i}].taxRate`, Math.round(Math.abs(taxRate)).toFixed(2));

                                                                                                                        const vatPerc = parseFloat(values.items[i].vatPerc || 0);
                                                                                                                        const vatRate = ((amountNum) * vatPerc) / 100;
                                                                                                                        setFieldValue(`items[${i}].vatRate`, Math.round(Math.abs(vatRate)).toFixed(2));

                                                                                                                    }}
                                                                                                                />
                                                                                                            );
                                                                                                        }}
                                                                                                    </Field>






                                                                                                    {errors.items?.[i]?.amount && (
                                                                                                        <div className="text-danger small">{errors.items[i].amount}</div>
                                                                                                    )}
                                                                                                </td>
                                                                                            )}

                                                                                            {(selectedCategory?.categoryid === 3 && 1 === 0) && (
                                                                                                <td>
                                                                                                    <Select
                                                                                                        value={
                                                                                                            taxList?.find(opt => opt.value === item.taxid) || null
                                                                                                        }
                                                                                                        menuPortalTarget={document.body}

                                                                                                        onChange={(selected) => {
                                                                                                            setFieldValue(`items[${i}].taxid`, selected.value || "");


                                                                                                            const value = parseFloat(selected.taxperc) || 0;

                                                                                                            // Validate value
                                                                                                            if (value < 0 || value > 100) return;

                                                                                                            setFieldValue(`items[${i}].taxPerc`, value);

                                                                                                            // Automatically calculate taxRate = (amount * tax %) / 100
                                                                                                            const amount = parseFloat(values.items[i].amount || 0);
                                                                                                            const taxRate = (amount * value) / 100;
                                                                                                            setFieldValue(`items[${i}].taxRate`, Math.round(Math.abs(taxRate)).toFixed(2));


                                                                                                        }}
                                                                                                        options={taxList || []}
                                                                                                        placeholder="Select Tax"
                                                                                                        classNamePrefix="react-select"
                                                                                                        isDisabled={!isEditable}
                                                                                                    />
                                                                                                    {errors.items?.[i]?.taxid && touched.items?.[i]?.taxid && (
                                                                                                        <div className="text-danger small">{errors.items[i].taxid}</div>
                                                                                                    )}




                                                                                                </td>
                                                                                            )}
                                                                                            {(selectedCategory?.categoryid === 3 && 1 === 0) && (

                                                                                                <td>
                                                                                                    <Field
                                                                                                        name={`items[${i}].taxPerc`}
                                                                                                        type="text"
                                                                                                        inputMode="decimal"
                                                                                                        className="form-control text-end"
                                                                                                        disabled
                                                                                                    />
                                                                                                    {errors.items?.[i]?.taxPerc && touched.items?.[i]?.taxPerc && (
                                                                                                        <div className="text-danger small">{errors.items[i].taxPerc}</div>
                                                                                                    )}
                                                                                                </td>
                                                                                            )}
                                                                                            {(selectedCategory?.categoryid === 3 && 1 === 0) && (
                                                                                                <td>

                                                                                                    <Field name={`items[${i}].taxRate`} disabled>
                                                                                                        {({ field }) => {
                                                                                                            const formatWithCommas = (value) => {
                                                                                                                if (value === undefined || value === null || value === '') return '';
                                                                                                                const [intPart, decPart] = value.toString().split('.');
                                                                                                                const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                                                                                                // Keep up to 6 decimals
                                                                                                                return decPart !== undefined
                                                                                                                    ? `${intFormatted}.${decPart.slice(0, 2)}`
                                                                                                                    : intFormatted;
                                                                                                            };

                                                                                                            return (
                                                                                                                <input
                                                                                                                    {...field}
                                                                                                                    disabled
                                                                                                                    className="form-control"
                                                                                                                    value={formatWithCommas(field.value)}
                                                                                                                />
                                                                                                            );
                                                                                                        }}
                                                                                                    </Field>

                                                                                                </td>
                                                                                            )}
                                                                                            {(selectedCategory?.categoryid === 3 && 1 === 0) && (


                                                                                                <td>
                                                                                                    <Select
                                                                                                        value={vatList?.find(opt => opt.value === item.vatid) || null}
                                                                                                        menuPortalTarget={document.body}
                                                                                                        onChange={(selected) => {
                                                                                                            setFieldValue(`items[${i}].vatid`, selected.value || "");

                                                                                                            const vatPerc = parseFloat(selected?.vatperc || 0);
                                                                                                            setFieldValue(`items[${i}].vatPerc`, vatPerc);

                                                                                                            // Auto calc VAT Rate
                                                                                                            const amount = parseFloat(values.items[i].amount || 0);
                                                                                                            const vatRate = (amount * vatPerc) / 100;
                                                                                                            setFieldValue(`items[${i}].vatRate`, Math.round(Math.abs(vatRate)).toFixed(2));
                                                                                                        }}
                                                                                                        isDisabled={!isEditable}
                                                                                                        options={vatList || []}
                                                                                                        placeholder="Select VAT"
                                                                                                        classNamePrefix="react-select"
                                                                                                    />
                                                                                                </td>
                                                                                            )}
                                                                                            {(selectedCategory?.categoryid === 3 && 1 === 0) && (


                                                                                                <td>
                                                                                                    <Field
                                                                                                        name={`items[${i}].vatPerc`}
                                                                                                        type="text"
                                                                                                        className="form-control text-end"
                                                                                                        disabled
                                                                                                    />
                                                                                                </td>)}
                                                                                            {(selectedCategory?.categoryid === 3 && 1 === 0) && (

                                                                                                <td>
                                                                                                    <Field name={`items[${i}].vatRate`} disabled>
                                                                                                        {({ field }) => (
                                                                                                            <input
                                                                                                                {...field}
                                                                                                                disabled
                                                                                                                className="form-control text-end"
                                                                                                                value={Number(field.value || 0).toLocaleString('en-US', {
                                                                                                                    minimumFractionDigits: 2
                                                                                                                })}
                                                                                                            />
                                                                                                        )}
                                                                                                    </Field>
                                                                                                </td>)}
                                                                                            {(selectedCategory?.categoryid === 3 && 1 === 0) && (
                                                                                                <td className="text-end">
                                                                                                    {item.IsTaxCalType == 1 ? (

                                                                                                        ((parseFloat(item.amount || 0) + parseFloat(item.vatRate || 0)) - parseFloat(item.taxRate || 0))?.toLocaleString('en-US', {
                                                                                                            style: 'decimal',
                                                                                                            minimumFractionDigits: 2
                                                                                                        })
                                                                                                        // (parseFloat(item.amount || 0) + parseFloat(item.taxRate || 0))
                                                                                                    ) : (
                                                                                                        (parseFloat(item.amount || 0) - parseFloat(item.taxRate || 0))?.toLocaleString('en-US', {
                                                                                                            style: 'decimal',
                                                                                                            minimumFractionDigits: 2
                                                                                                        })

                                                                                                        // (parseFloat(item.amount || 0) - parseFloat(item.taxRate || 0))
                                                                                                    )}
                                                                                                </td>
                                                                                            )}




                                                                                            <td>
                                                                                                <Field
                                                                                                    name={`items[${i}].date`}
                                                                                                    type="date"
                                                                                                    className="form-control"
                                                                                                    title="Expense Date"
                                                                                                    disabled={!isEditable}
                                                                                                />
                                                                                                {errors.items?.[i]?.date && (
                                                                                                    <div className="text-danger small">{errors.items[i].date}</div>
                                                                                                )}
                                                                                            </td>
                                                                                            <td>
                                                                                                <Field
                                                                                                    name={`items[${i}].purpose`}
                                                                                                    className="form-control"
                                                                                                    title="Purpose"
                                                                                                    disabled={!isEditable}
                                                                                                />
                                                                                                {errors.items?.[i]?.purpose && (
                                                                                                    <div className="text-danger small">{errors.items[i].purpose}</div>
                                                                                                )}
                                                                                            </td>
                                                                                            <td>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => handleEditRow(i, item?.claimType)}
                                                                                                    style={{ background: 'none', border: 'none', padding: 0, marginRight: '10px' }}
                                                                                                >
                                                                                                    <i className="mdi mdi-pencil-outline text-primary" style={{ fontSize: '18px', cursor: 'pointer' }}></i>
                                                                                                </button>

                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => { remove(i); }}
                                                                                                    style={{ background: 'none', border: 'none', padding: 0 }}
                                                                                                >
                                                                                                    <i className="mdi mdi-delete-outline text-danger" style={{ fontSize: '18px', cursor: 'pointer' }}></i>
                                                                                                </button>
                                                                                            </td>
                                                                                        </tr>);
                                                                                })}
                                                                                {/* <tr>
                                                                            <td colSpan={10}>
                                                                                <button
                                                                                    type="button"
                                                                                    className="btn btn-primary btn-sm"
                                                                                    onClick={() =>{
                                                                                       push({
                                                                                        ClaimDtlId: 0,
                                                                                        claimType: "",
                                                                                        description: "",
                                                                                        amount: "",        
                                                                                        taxRate: "",       
                                                                                        date: new Date().toISOString().slice(0, 10),
                                                                                        purpose: "",
                                                                                        PaymentDescription:""
                                                                                        });
                                                                                        setEditableRows([values.items.length]);

                                                                                    }


                                                                                    }
                                                                                >
                                                                                    +
                                                                                </button>
                                                                            </td>
                                                                        </tr> */}
                                                                            </tbody>
                                                                            <tfoot>
                                                                                {access.canViewRate && (
                                                                                    <tr>
                                                                                        <td colSpan={3}>Total</td>
                                                                                        {(selectedCategory?.categoryid === 3 && 1 === 0) && (
                                                                                            <td colSpan={8}></td>
                                                                                        )}
                                                                                        {selectedCategory?.categoryid === 3 && (
                                                                                            <td ></td>
                                                                                        )}
                                                                                        <td className="text-end">{

                                                                                            totalAmount?.toLocaleString('en-US', {
                                                                                                style: 'decimal',
                                                                                                minimumFractionDigits: 2
                                                                                            })



                                                                                        }</td>
                                                                                        <td colSpan={3}></td>

                                                                                    </tr>
                                                                                )}
                                                                            </tfoot>
                                                                        </Table>
                                                                    </div>
                                                                )}
                                                            </FieldArray>
                                                        )}

                                                        <Row>
                                                            <Col md={12}>
                                                                <Label for="remarks">Remarks </Label>
                                                                <Field as="textarea" name="remarks" rows={3} className="form-control" />
                                                            </Col>
                                                        </Row>
                                                    </Form>
                                                </>
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
                        {previewUrl.endsWith(".pdf") ? (
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

export default Copyclaimpayment;
