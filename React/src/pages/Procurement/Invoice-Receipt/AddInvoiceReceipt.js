import React, { useState, useMemo, useEffect, useRef } from "react";
import { InputSwitch } from "primereact/inputswitch";

import { useParams } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  FormGroup,
  Label,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import Flatpickr from "react-flatpickr";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Breadcrumbs from "../../../components/Common/Breadcrumb";
import Select from "react-select";
// PrimeReact imports
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Calendar } from "primereact/calendar";
import { Checkbox } from "primereact/checkbox";
import { FileUpload } from "primereact/fileupload";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { RadioButton } from "primereact/radiobutton";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { useHistory } from "react-router-dom";
import {
  GetPaymentMethods, GetSupplierById,
  GetPurchaseRequisitionSupplierList, GetGRNList, GetSupplierList, GetIRList, SaveIRN, EditIRN, UpdateIRN, GetInvoiceReceiptAddDetails, SaveAddIRNGRNDet, GenerateSPC, GetAllIRNList, uploadIRNAttachment, GetGRNById, DownloadInvoiceReceiptFile, IRNGetBy
} from "common/data/mastersapi";

import Swal from "sweetalert2";
import { startOfWeek, endOfWeek } from "date-fns";
// const poOptions = [...new Set(sampleItems.map((i) => i.poNo))].map((po) => ({
//   label: `PO-${po}`,
//   value: po
// }));

// const grnOptions = [...new Set(sampleItems.map((i) => i.grnNo))].map((grn) => ({
//   label: `GRN-${grn}`,
//   value: grn
// }));

const searchFormatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getUserDetails = () => {
  if (localStorage.getItem("authUser")) {
    const obj = JSON.parse(localStorage.getItem("authUser"))
    return obj;
  }
}

const AddInvoiceReceipt = () => {
  const formikRef = useRef();
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const isApiSavingRef = useRef(false);
  const today = new Date();
  const defaultFromDate = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const defaultToDate = new Date(defaultFromDate);
  defaultToDate.setDate(defaultFromDate.getDate() + 5); // Saturday
  const { irnid } = useParams();
  const isEditMode = Boolean(irnid && parseInt(irnid));
  const [UserData, setUserData] = useState(null);
  const isRestrictedUser = [159, 160, 161, 163, 165].includes(UserData?.u_id);
  const [suppliers, setsuppliers] = useState(null);
  const [orgId, setOrgId] = useState(1);
  const [branchId, setBranchId] = useState(1);
  const [poOptions, setpoOptions] = useState([]);
  const [grnOptions, setgrnOptions] = useState([]);
  const history = useHistory();
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState({});
  const [supplier, setSupplier] = useState(null);
  const [initialValues, setInitialValues] = useState({
    items: []
  });
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const isAllSelected = items.length > 0 && selectedItems.length === items.length;
  const [dueFromDate, setDueFromDate] = useState(defaultFromDate);
  const [dueToDate, setDueToDate] = useState(defaultToDate);

  const [showModal, setShowModal] = useState(false);
  const [currentRow, setCurrentRow] = useState(null); // which row we are uploading for
  const [newFiles, setNewFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [modeOfPaymentOptions, setModeOfPaymentOptions] = useState([]);

  const toggleModal = () => setShowModal(!showModal);

  // useEffect(() => {
  //   handleSearch(dueFromDate, dueToDate);
  // }, [defaultFromDate,defaultToDate]);

  const validationSchema = (selectedItems) =>
    Yup.object().shape({
      items: Yup.array().of(
        Yup.object().shape({
          // grnId: Yup.number().required(),
          invoiceNo: Yup.string()
            .when("grnId", {
              is: (grnId) => selectedItems.includes(grnId), // only validate selected rows
              then: (schema) =>
                schema
                  .required("Invoice No. is required"),
              // .matches(/^[a-zA-Z0-9]*$/, "Invoice No. must be alphanumeric"), // ✅ alphanumeric only
              otherwise: (schema) => schema.notRequired(),
            }),
          invoiceDate: Yup.date().nullable().when("grnId", {
            is: (grnId) => selectedItems.includes(grnId),
            then: (schema) =>
              schema.required("Invoice Date is required").typeError("Invalid date"),
            otherwise: (schema) => schema.nullable(),
          }),
          irnDate: Yup.date()
            .nullable()
            .when("grnId", {
              is: (grnId) => selectedItems.includes(grnId),
              then: (schema) =>
                schema
                  .required("IRN Date is required")
                  .typeError("Invalid date")
                  .test("min-grn-date", "IRN Date cannot be earlier than GRN Date", function (value) {
                    const { grnDate } = this.parent;
                    if (!grnDate || !value) return true;
                    const irnDt = new Date(value);
                    const grnDt = new Date(grnDate);
                    irnDt.setHours(0, 0, 0, 0);
                    grnDt.setHours(0, 0, 0, 0);
                    return irnDt >= grnDt;
                  }),
              otherwise: (schema) => schema.nullable(),
            }),
          modeOfPaymentId: Yup.number()
            .nullable()
            .when("grnId", {
              is: (grnId) => selectedItems.includes(grnId),   // GRN checkbox selected
              then: Yup.number()
                .min(1, "Mode of Payment is required")
                .required("Mode of Payment is required"),
              otherwise: Yup.number().nullable(),             // Not selected → ignore
            }),

          dueDate: Yup.date().nullable().when("grnId", {
            is: (grnId) => selectedItems.includes(grnId),
            then: (schema) =>
              schema.required("Due Date is required").typeError("Invalid date"),
            otherwise: (schema) => schema.nullable(),
          }),
          balanceAmount: Yup.string()
            .nullable()
            .when("grnId", {
              is: (grnId) => selectedItems.includes(grnId),
              then: (schema) =>
                schema

                  .required("Balance Amount is required")
                  .test(
                    "not-greater-than-oribal",
                    "Balance Amount cannot exceed pending amount",
                    function (value) {

                      const { oribal } = this.parent;
                      const entered = parseFloat(String(value || "0").replace(/,/g, "")) || 0;
                      const oribalamt = parseFloat(String(oribal || "0").replace(/,/g, "")) || 0;
                      return entered <= oribalamt;
                    }
                  ),

              // .test(
              //   "not-greater-than-system-balance",
              //   "Balance Amount cannot exceed available balance (PO - Advance - Already Received)",
              //   function (value) {
              //     const { poAmount, advancePayment, alreadyReceived } = this.parent;

              //     if (!value) return true; // allow empty here; required() will catch it
              //     const parseNum = (v) => Number(String(v || "0").replace(/,/g, "")) || 0;

              //     const balance = parseNum(value);
              //     const po = parseNum(poAmount);
              //     const adv = parseNum(advancePayment);
              //     const already = parseNum(alreadyReceived);

              //     const systemBalance = po - (adv + already);

              //     return balance <= systemBalance;
              //   }
              // ),
              otherwise: (schema) => schema.nullable(),
            }),
        })
      ),
    });

  // Open upload modal for a row
  //  const handleOpenUpload = (rowIndex, values) => {
  //   setCurrentRow(rowIndex);
  //   // Get attachments from Formik values for the specific row
  //   // setExistingFiles(values.items[rowIndex].attachments || []);
  //   // setNewFiles([]);
  //   setExistingFiles([]);
  //   setNewFiles(values.items[rowIndex].attachments || []);
  //   setShowModal(true);
  // };

  const handleOpenUpload = (rowIndex, values) => {
    setCurrentRow(rowIndex);

    const rowAttachments = values.items[rowIndex].attachments || [];

    // Map existing files to include `name` for display
    const existing = rowAttachments
      .filter((file) => file.receiptnote_hdr_id && file.filename)
      .map((file) => ({
        ...file,
        name: file.filename, // ensure UI can show it
        url: file.filepath ? `${file.filepath}/${file.filename}` : null, // optional for download/preview
      }));

    const newOnes = rowAttachments.filter((file) => !file.receiptnote_hdr_id);

    setExistingFiles(existing);
    setNewFiles(newOnes);

    setShowModal(true);
  };


  useEffect(() => {
    const fetchIRN = async () => {
      try {
        const res = await IRNGetBy(irnid, branchId, orgId);
        if (res?.status && res?.data?.Header) {
          const header = res.data.Header;
          const attachments = res.data.Attachment || [];

          // Map to Formik structure
          const formValues = {
            items: [
              {
                modeOfPaymentId: header.ModeOfPaymentId,
                receiptnote_hdr_id: header.receiptnote_hdr_id,
                supplierId: header.supplier_id,
                supplierName: header.suppliername,
                poid: header.poid,
                pono: header.pono,
                grnId: header.grn_id,
                grnNo: header.grnno,
                grnDate: header.grndate,
                invoiceNo: header.invoice_no,
                invoiceDate: header.invoice_dt ? new Date(header.invoice_dt) : null,
                irnDate: header.receipt_Date ? new Date(header.receipt_Date) : new Date(),
                dueDate: header.due_dt ? new Date(header.due_dt) : null,
                balanceAmount: header.balance_payment,
                oribal: header.oribal,
                poAmount: header.po_amount,
                advancePayment: header.balancepaymentamount,
                alreadyReceived: header.alreadyrecivedamount,
                allocated: header.adv_payment,
                irnStatus: header.irnstatus,
                isShortClosureSubmitted: header.IsShortClosureSubmitted || header.isShortClosureSubmitted || 0,
                attachments: attachments.map((a) => ({
                  receiptnote_hdr_id: a.receiptnote_hdr_id,
                  filepath: a.filepath,
                  filename: a.filename,
                  grnId: a.grn_id,
                  grnNo: a.grnno,
                })),
              },
            ],
          };

          setInitialValues(formValues);

          // ✅ Set default checked items
          const defaultSelected =
            header.irnstatus === "Saved" ? [header.grn_id] : [];
          setSelectedItems(defaultSelected);
        }
      } catch (error) {
        console.error("Error fetching IRN:", error);
      }
    };
    if (isEditMode) {
      fetchIRN();
    }
  }, [irnid, isEditMode]);

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => file.size <= 2 * 1024 * 1024); // 2 MB
    setNewFiles(prev => [...prev, ...validFiles]);
  };

  // Remove selected attachment
  const removeAttachment = (index, type) => {
    if (type === "new") {
      setNewFiles(prev => prev.filter((_, i) => i !== index));
    } else if (type === "existing") {
      setExistingFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Save attachments back to Formik values
  const handleSaveAttachments = (setFieldValue) => {
    // Merge existing + new files
    const allFiles = [...existingFiles, ...newFiles];

    // Update Formik field for the current row
    setFieldValue(`items[${currentRow}].attachments`, allFiles);

    // Close modal
    setShowModal(false);
  };




  const buildPOInvoices = (apiData, type, cat) => {
    const grouped = {};
    debugger;
    apiData?.forEach((row) => {
      const key = row.po_no;
      if (type == 1) {
        if (!grouped[key]) {
          grouped[key] = {
            id: row.po_id,
            invoiceNo: row.invoice_no || "",
            invoiceDate: row.invoice_date
              ? new Date(row.invoice_date)                 // ✅ edit case
              : row.po_date ? new Date(row.po_date) : null, // ✅ new case fallback
            dueDate: row.due_date ? new Date(row.due_date) : null,
            balanceAmount: '',
            oribal: 0,
            poAmount: '',
            advancePayment: '',
            alreadyReceived: '',
            allocated: '',
            items: [],
            receiptnote_hdr_id: row.receiptnote_hdr_id,
            receiptsummarydtl_id: row.receiptsummarydtl_id,
            refId: cat == "GRN" ? row.grn_id : row.po_id,
            spc: row.spc == 1 ? true : false


          };
        }
      } else {
        if (!grouped[key]) {
          grouped[key] = {
            id: row.po_id,
            invoiceNo: row.invoice_no || "",
            invoiceDate: row.invoice_date
              ? new Date(row.invoice_date)                 // ✅ edit case
              : row.po_date ? new Date(row.po_date) : null, // ✅ new case fallback
            dueDate: row.due_date ? new Date(row.due_date) : null,
            balanceAmount: '',
            oribal: 0,
            poAmount: '',
            advancePayment: '',
            alreadyReceived: '',
            allocated: '',
            items: [],
            receiptnote_hdr_id: row.receiptnote_hdr_id,
            receiptsummarydtl_id: row.receiptsummarydtl_id,
            spc: false
          };
        }
      }
      grouped[key].items.push({
        id: row.pod_id,
        po_no: row.po_no,
        itemName: row.item_name,
        uom: row.uom,
        qty: row.qty,
        unitPrice: row.unit_price,
        subTotal: row.sub_total,
        netTotal: row.net_total,
        vatValue: row.vat_value,
        vatPercent: row.vat_per,
        grnNo: row.grnno,
        taxPercent: row.tax_per,
        taxValue: row.tax_value,
        currencyid: row.currencyid,
        item_id: row.item_id,

        receiptnote_hdr_id: row.receiptnote_hdr_id,
        receiptdtl_id: row.receiptdtl_id,
        receiptsummarydtl_id: row.receiptsummarydtl_id
      });
    });

    return Object.values(grouped);
  };



  // const [invoices, setInvoices] = useState(buildInvoices());
  const [invoices, setInvoices] = useState([]);

  const [expandedRows, setExpandedRows] = useState(null);


  const loadOptions = async () => {
    let result = [];
    result = await GetPurchaseRequisitionSupplierList(orgId, branchId, "%");
    setsuppliers(
      (result?.data || []).map(item => ({
        label: item.SupplierName,
        value: item.SupplierID,
      }))
    );
  };

  const load = async (supplier, id, type, selectedIds) => {
    let result = await GetIRList(orgId, id, type);
    const newInvoices = buildPOInvoices(result.data, 0, "").map((inv) => ({
      ...inv,
      refId: id,
      type: type === 1 ? "PO" : "GRN",
    }));

    setInvoices((prev) => {
      // 1️⃣ remove any unselected
      let updated = prev.filter((inv) => {
        if (inv.type === (type === 1 ? "PO" : "GRN")) {
          return selectedIds.includes(inv.refId);
        }
        return true;
      });

      // 2️⃣ add new ones if not already present
      newInvoices.forEach((inv) => {
        if (!updated.some((i) => i.refId === inv.refId && i.type === inv.type)) {
          updated.push(inv);
        }
      });

      return updated;
    });
  };


  const loadpo = async (value) => {
    let result = [];
    result = await GetSupplierList(orgId, 1, value);
    setpoOptions(
      (result?.data || []).map(item => ({
        label: item.po_no,
        value: item.po_id,
      }))
    );
  };

  const loadgrn = async (value) => {
    let result = [];
    result = await GetGRNList(orgId, 1, value);
    setgrnOptions(
      (result?.data || []).map(item => ({
        label: item.grn_no,
        value: item.grn_id,
      }))
    );
  };


  useEffect(() => {
    const userData = getUserDetails();
    setUserData(userData);
    loadOptions();
    if (isEditMode) {
      loadEditData(irnid);
    }
    const fetchDropdownData = async () => {
      var paymentModes = await GetPaymentMethods(1, 0);

      const paymentOptions = Array.isArray(paymentModes) ?
        paymentModes.map((mode) => ({
          value: mode.PaymentMethodId,
          label: mode.PaymentMethod
        })) : [];

      setModeOfPaymentOptions(paymentOptions);

    }
    fetchDropdownData();
    // load();
  }, []);
  const loadEditData = async (id) => {
    const result = await EditIRN(id, orgId);   // 👈 call your API
    if (result?.status) {
      const data = result.data;

      // Map header + details into your state
      setSupplier(data.header.supplier_id);

      loadpo(data.header.supplier_id);
      loadgrn(data.header.supplier_id);

      debugger;
      const cat = data.header.cat_type_id === 1 ? "PO" : "GRN";
      setCategory(cat);

      // 2. Selected POs / GRNs
      if (cat === "PO") {
        const poIds = data.details.map(d => d.purchase_id).filter(Boolean);
        setSelectedPOs(poIds);
      } else {
        const grnIds = data.details.map(d => d.grn_id).filter(Boolean);
        setSelectedGRNs(grnIds);
      }

      const apiRows = data.Requisition.map(d => ({
        spc: d.spc,
        po_id: d.purchase_id || 0,
        po_no: d.pono || null,
        grn_id: d.grn_id || 0,
        grnno: d.grnno || null,
        invoice_no: d.invoice_no,
        invoice_date: d.invoice_dt,
        due_date: d.due_dt,
        receiptsummarydtl_id: d.receiptsummarydtl_id,
        receiptnote_hdr_id: d.receiptnote_hdr_id,
        receiptdtl_id: d.receiptdtl_id,
        // 👇 filler for items
        pod_id: d.purchase_id,    // map into item id
        item_name: d.item_name || "", // if API gives items
        uom: d.uom || "",
        qty: d.qty || 0,
        unit_price: d.unit_price || 0,
        sub_total: d.sub_total || 0,
        net_total: d.net_total || 0,
        vat_value: d.vat_value || 0,
        vat_per: d.vat_per || 0,
        tax_per: d.tax_per || 0,
        tax_value: d.tax_value || 0,
        currencyid: d.currencyid || 0,
        item_id: d.item_id || 0
      }));


      const editInvoices = buildPOInvoices(apiRows, 1, cat);


      setInvoices(editInvoices);
    }
  };
  const buildParentRows = () => {
    const rows = [];
    invoices.forEach(inv => {
      if (category === "PO") {
        const uniquePOs = [...new Set(inv.items.map(it => it.po_no))];
        uniquePOs.forEach(po => {
          rows.push({
            id: `${inv.id}-${po}`,
            invoiceNo: inv.invoiceNo,
            invoiceDate: inv.invoiceDate,
            dueDate: inv.dueDate,
            balanceAmount: '',
            oribal: 0,
            poAmount: '',
            advancePayment: '',
            alreadyReceived: '',
            allocated: '',
            poNo: po,
            grnNo: null,
            poid: inv.po_id,
            modeOfPaymentId: 0,
            grnid: 0,
            spc: inv.spc,
            // 🔹 all items for this PO
            items: inv.items.filter(it => it.po_no === po)
          });
        });
      } else {
        const uniqueGRNs = [...new Set(inv.items.map(it => it.grnNo))];
        uniqueGRNs.forEach(grn => {
          rows.push({
            id: `${inv.id}-${grn}`,
            invoiceNo: inv.invoiceNo,
            invoiceDate: inv.invoiceDate,
            dueDate: inv.dueDate,
            balanceAmount: '',
            oribal: 0,
            poAmount: '',
            advancePayment: '',
            alreadyReceived: '',
            allocated: '',
            poNo: null,
            grnNo: grn,
            poid: 0,
            modeOfPaymentId: 0,
            spc: inv.spc,
            grnid: inv.grn_id,
            // 🔹 all items for this GRN
            items: inv.items.filter(it => it.grnNo === grn)
          });
        });
      }
    });
    return rows;
  };


  // new states

  const [category, setCategory] = useState("PO"); // PO or GRN
  const [selectedPOs, setSelectedPOs] = useState([]);
  const [selectedGRNs, setSelectedGRNs] = useState([]);
  const parentRows = useMemo(() => buildParentRows(), [invoices, category]);

  const formatAmount = (val) =>
    val?.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  const computeDerived = (item) => {
    const totalAmt = (item.unitPrice || 0) * (item.qty || 0);
    const taxValue = totalAmt * ((item.taxPercent || 0) / 100);
    const vatValue = totalAmt * ((item.vatPercent || 0) / 100);
    const netTotal = totalAmt - taxValue + vatValue;
    return { totalAmt, taxValue, vatValue, netTotal };
  };
  const safeNum = (val) => (val == null || val === "" ? 0 : val);

  // const buildPayload = (isGenerated) => {
  //   return {
  //     header: {
  //       receiptnote_hdr_id: 0,
  //       supplier_id: safeNum(supplier),
  //       category_id: category === "PO" ? 1 : 2,
  //       po_id: "",
  //       receipt_no: "",
  //       receipt_date: new Date().toISOString(),
  //       isactive: 1,
  //       userid: 1,
  //       createdip: "127.0.0.1",
  //       modifiedip: "127.0.0.1",
  //       branchid: branchId,
  //       orgid: orgId,
  //       isGenerated: isGenerated
  //     },
  //     details: invoices.map((inv) => ({
  //       receiptnote_hdr_id: 0,
  //       po_id: category === "PO" ? safeNum(inv.refId) : 0,
  //       grn_id:category === "GRN" ? safeNum(inv.refId) : 0,
  //       invoice_no: inv.invoiceNo || "",
  //       invoice_date: inv.invoiceDate
  //         ? new Date(inv.invoiceDate).toISOString().split("T")[0]
  //         : null,
  //       due_date: inv.dueDate
  //         ? new Date(inv.dueDate).toISOString().split("T")[0]
  //         : null,
  //       file_attach_path: inv.filePath || "",
  //       file_name: inv.fileName || "",
  //       spc: safeNum(inv.spc),
  //       isactive: 1,
  //       userid: 1,
  //       createdip: "127.0.0.1",
  //       modifiedip: "127.0.0.1",
  //       branchid: branchId,
  //       orgid: orgId
  //     })),
  //     requisition: invoices.flatMap((inv) =>
  //       inv.items.map((it) => ({
  //         receiptnote_hdr_id: 0,
  //         item_id: safeNum(it.id),
  //         unit_price: safeNum(it.unitPrice),
  //         qty: safeNum(it.qty),
  //         rate: safeNum(it.unitPrice),
  //         total_amount: safeNum(it.subTotal),
  //         tax_perc: safeNum(it.taxPercent),
  //         total_value: safeNum(it.subTotal) + safeNum(it.taxValue),
  //         vat_perc: safeNum(it.vatPercent),
  //         vat_value: safeNum(it.vatValue),
  //         net_amount: safeNum(it.netTotal),
  //         create_by: 1,
  //         ip_address: "127.0.0.1",
  //         isactive: 1,
  //         branchid: branchId,
  //         orgid: orgId,
  //         currencyid:it.currencyid
  //       }))
  //     )
  //   };
  // };

  const buildPayload = (isGenerated) => {
    const userData = getUserDetails();
    return {
      header: {
        receiptnote_hdr_id: invoices[0]?.receiptnote_hdr_id || 0,   // existing id if edit
        supplier_id: safeNum(supplier),
        category_id: category === "PO" ? 1 : 2,
        po_id: "",
        receipt_no: "",
        receipt_date: new Date().toISOString(),
        isactive: 1,
        userid: userData?.u_id,
        createdip: "127.0.0.1",
        modifiedip: "127.0.0.1",
        branchid: branchId,
        orgid: orgId,
        isGenerated: isGenerated
      },
      details: invoices.map((inv) => ({
        receiptsummarydtl_id: inv.receiptsummarydtl_id || 0,
        receiptnote_hdr_id: inv.receiptnote_hdr_id || 0,
        po_id: category === "PO" ? safeNum(inv.refId) : 0,
        grn_id: category === "GRN" ? safeNum(inv.refId) : 0,
        invoice_no: inv.invoiceNo || "",
        invoice_date: inv.invoiceDate
          ? new Date(inv.invoiceDate).toISOString().split("T")[0]
          : null,
        due_date: inv.dueDate
          ? new Date(inv.dueDate).toISOString().split("T")[0]
          : null,
        balanceAmount: '',
        oribal: 0,
        poAmount: '',
        advancePayment: '',
        alreadyReceived: '',
        allocated: '',
        file_attach_path: inv.filePath || "",
        file_name: inv.fileName || "",
        spc: safeNum(inv.spc == true ? 1 : 0),
        isactive: 1,
        userid: userData?.u_id,
        createdip: "127.0.0.1",
        modifiedip: "127.0.0.1",
        branchid: branchId,
        orgid: orgId
      })),
      requisition: invoices.flatMap((inv) =>
        inv.items.map((it) => ({
          receiptnote_hdr_id: inv.receiptnote_hdr_id || 0,
          receiptsummarydtl_id: it.receiptsummarydtl_id || 0,
          receiptdtl_id: it.receiptdtl_id || 0,
          item_id: safeNum(it.item_id),
          unit_price: safeNum(it.unitPrice),
          qty: safeNum(it.qty),
          rate: safeNum(it.unitPrice),
          total_amount: safeNum(it.subTotal),
          tax_perc: safeNum(it.taxPercent),
          total_value: safeNum(it.subTotal) + safeNum(it.taxValue),
          vat_perc: safeNum(it.vatPercent),
          vat_value: safeNum(it.vatValue),
          net_amount: safeNum(it.netTotal),
          create_by: 1,
          ip_address: "127.0.0.1",
          isactive: 1,
          branchid: branchId,
          orgid: orgId,
          currencyid: it.currencyid
        }))
      )
    };
  };



  const uploadBody = (rowData) => (

    <button type="button" className="btn btn-success ">
      <i className="fa fa-paperclip label-icon font-size-14 align-middle me-2"></i>Add</button>

  );
  const handleCancel = () => {
    history.push("/InvoiceReceipt");
  };
  const itemsTable = (invoice) => {
    // filter items based on dropdowns
    let filteredItems = invoice.items;
    if (category === "PO" && selectedPOs.length) {
      filteredItems = invoice.items.filter((it) => selectedPOs.includes(it.poNo));
    } else if (category === "GRN" && selectedGRNs.length) {
      filteredItems = invoice.items.filter((it) => selectedGRNs.includes(it.grnNo));
    }

    return (
      <DataTable value={filteredItems} dataKey="id" responsiveLayout="scroll" className="p-datatable-sm">
        <Column field="poNo" header="PO #" />
        <Column field="grnNo" header="GRN #" />
        <Column field="itemName" header="Item Name" />
        <Column field="unitPrice" header="Unit Price" body={(r) => formatAmount(r.unitPrice)} />
        <Column field="qty" header="Qty" body={(r) => r.qty} />
        <Column header="Total Amt" body={(r) => formatAmount(r.subTotal)} />
        <Column field="taxPercent" header="Tax %" />
        <Column header="Tax Value" body={(r) => formatAmount(r.taxValue)} />
        <Column field="vatPercent" header="VAT %" />
        <Column header="VAT Value" body={(r) => formatAmount(r.vatValue)} />
        <Column header="Net total" body={(r) => formatAmount(r.netTotal)} />
        <Column header="Copy" body={() => <Checkbox />} />
        <Column header="Upload Inv" bodyStyle={{ textAlign: "center" }} body={(r) => uploadBody(r)} />
        <Column
          header="SPC"
          body={(rowData, options) => (
            <Checkbox
              checked={rowData.spc === 1}
              onChange={(e) => {
                const newValue = e.checked ? 1 : 0;

                setInvoices((prev) =>
                  prev.map((inv, idx) =>
                    idx === options.rowIndex
                      ? { ...inv, spc: newValue }
                      : inv
                  )
                );
              }}
            />
          )}
        />
      </DataTable>
    );
  };

  //   };
  const rowExpansionTemplate = (rowData) => (
    <div className="p-3">
      <DataTable
        value={rowData.items}
        responsiveLayout="scroll"
        className="p-datatable-sm child-table"
      >
        <Column field="itemName" header="Item Name" />
        <Column field="unitPrice" header="Unit Price" body={(r) => formatAmount(r.unitPrice)} />
        <Column field="qty" header="Qty" />
        <Column header="Total Amt" body={(r) => formatAmount(r.subTotal)} />
        <Column field="taxPercent" header="Tax %" />
        <Column header="Tax Value" body={(r) => formatAmount(r.taxValue)} />
        <Column field="vatPercent" header="VAT %" />
        <Column header="VAT Value" body={(r) => formatAmount(r.vatValue)} />
        <Column header="Net total" body={(r) => formatAmount(r.netTotal)} />
        {/* <Column header="Copy" body={() => <Checkbox />} /> */}


      </DataTable>
    </div>
  );
  const updateInvoiceField = (id, field, value) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? {
            ...inv,
            [field]: value,
          }
          : inv
      )
    );
  };

  // 📌 Format date to first of the month as Date object for Flatpickr
  const getFirstOfMonthDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 1); // first day of month
  };

  useEffect(() => {
    if (parentRows?.length) {
      const allExpanded = {};
      parentRows.forEach(row => {
        allExpanded[row.id] = true;
      });
      setExpandedRows(allExpanded);
    }
  }, [parentRows]);


  const handleSave = async (savetype) => {
    // ✅ Your save API call logic goes here
    // Example: await saveInvoices(invoices);
    if (!invoices.length) {
      Swal.fire("Error", "No records ", "error");
      return;
    }

    const hasInvalid = invoices.some(
      (inv) => !inv.invoiceNo || !inv.invoiceDate || !inv.dueDate
    );

    if (hasInvalid) {
      Swal.fire("Error", "Please fill Inv #, Inv Dt and Due Date ", "error");
      return;
    }



    const payload = buildPayload(savetype == 1 ? true : false); // false = Save, true = Generate
    console.log("SAVE PAYLOAD", payload);

    return;


    let result;
    if (isEditMode) {
      result = await UpdateIRN(payload);   // 🔹 update mode
    } else {
      result = await SaveIRN(payload);     // 🔹 add mode
    }

    if (result?.status) {
      Swal.fire({
        icon: "success",
        title: result.message,
        showConfirmButton: false,
        timer: 1500,
      }).then(() => {
        history.push("/InvoiceReceipt");
      });
    }




  };

  const handleGenerate = () => {
    // ✅ Your generate API call logic goes here
    // Example: await generateInvoices(invoices);
    if (!invoices.length) {
      Swal.fire("Error", "No records ", "error");
      return;
    }

    const hasInvalid = invoices.some(
      (inv) => !inv.invoiceNo || !inv.invoiceDate || !inv.dueDate
    );

    if (hasInvalid) {
      Swal.fire("Error", "Please fill Inv #, Inv Dt and Due Date ", "error");
      return;
    }
    Swal.fire({
      icon: "success",
      title: "Generated Successfully",
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      history.push("/InvoiceReceipt");
    });
  };

  const handleIRNDateChange = async (date, index, setFieldValue, values) => {
    if (!date) return;
    const item = values.items[index];

    // Validate IRN Date against GRN Date
    if (item.grnDate && date) {
      const grnDt = new Date(item.grnDate);
      const irnDt = new Date(date);
      grnDt.setHours(0, 0, 0, 0);
      irnDt.setHours(0, 0, 0, 0);

      if (irnDt < grnDt) {
        Swal.fire({
          icon: "warning",
          title: "Invalid Date",
          text: "IRN Date cannot be earlier than the GRN Date.",
          confirmButtonColor: "#3e6e9e"
        });
        setFieldValue(`items[${index}].irnDate`, new Date(item.grnDate));
        return;
      }
    }

    const supplierId = item.supplierId;

    try {
      // Default to 1 day if something goes wrong
      let days = 1;

      // Fetch supplier details to get payment term
      const res = await GetSupplierById(supplierId, orgId, branchId);
      if (res?.status && res.data?.[0]) {
        const paymentTerm = res.data[0].paymentterm || "";
        const match = paymentTerm.match(/\d+/);
        if (match) {
          days = parseInt(match[0], 10);
        }
      }

      const dueDate = new Date(date);
      dueDate.setDate(dueDate.getDate() + days);
      setFieldValue(`items[${index}].dueDate`, dueDate);
    } catch (error) {
      console.error("Error calculating due date:", error);
      // Fallback: IRN Date + 1 day
      const dueDate = new Date(date);
      dueDate.setDate(dueDate.getDate() + 1);
      setFieldValue(`items[${index}].dueDate`, dueDate);
    }
  };

  const handleSearch = async (from, to) => {
    const fromDate = searchFormatDate(from);
    const toDate = searchFormatDate(to);

    try {
      const res = await GetInvoiceReceiptAddDetails(branchId, orgId, fromDate, toDate);
      if (res?.data?.length > 0) {
        const mappedItems = res.data.map((item) => ({
          receiptnote_hdr_id: 0,
          grnId: item.grnid,
          grnNo: item.grnno,
          poid: item.poid,
          modeOfPaymentId: item.modeOfPaymentId,
          pono: item.pono,
          grnDate: item.grndate,
          supplierId: item.supplierid,
          supplierName: item.suppliername,
          invoiceNo: item.invoiceno,
          invoiceDate: item.invoicedate ? new Date(item.invoicedate) : null,
          irnDate: new Date(),
          dueDate: item.duedate ? new Date(item.duedate) : null,
          balanceAmount: item.balance_payment ? parseFloat(item.balance_payment).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00',
          oribal: item.oribal,
          poAmount: item.po_amount ? parseFloat(item.po_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00',
          advancePayment: item.total_adv_amount ? parseFloat(item.total_adv_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00',
          alreadyReceived: item.alreadyrecivedamount ? parseFloat(item.alreadyrecivedamount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00',
          allocated: item.adv_payment ? parseFloat(item.adv_payment).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00',
          attachments: [],
          spc: item.spc || false,
          isShortClosureSubmitted: item.IsShortClosureSubmitted || item.isShortClosureSubmitted || 0,
        }));

        if (isEditMode) {
          // Append new items to existing items
          setInitialValues((prev) => ({
            items: [...prev.items, ...mappedItems.filter(
              (newItem) => !prev.items.some((i) => i.grnId === newItem.grnId)
            )],
          }));
        } else {
          // Replace items if not edit mode
          setInitialValues({ items: mappedItems });
        }
      } else {
        if (!isEditMode) setInitialValues({ items: [] });
      }
    } catch (error) {
      console.error("Search failed", error);
    }
  };

  // ✅ Checkbox select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = initialValues?.items.map((item) => item.grnId);
      setSelectedItems(allIds);
    } else {
      setSelectedItems([]);
    }
  };

  // ✅ Checkbox single selection
  const handleCheckBoxChange = (e, item) => {
    const { checked } = e.target;
    if (checked) {
      setSelectedItems((prev) => [...prev, item.grnId]);
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== item.grnId));
    }
  };

  // ✅ Input change handler
  const handleInputChange = (index, field, value) => {
    setItems((prevItems) => {
      const updatedItems = [...prevItems];
      const item = { ...updatedItems[index] };

      if (field === "grnQty") {
        if (value === "") {
          item.grnQty = "";
        } else {
          let enteredQty = parseFloat(value);
          const balanceQty = parseFloat(item.oribalanceqty || 0);

          if (enteredQty < 0 || isNaN(enteredQty)) {
            alert(`Invalid Qty for ${item.itemDescription}`);
            item.grnQty = "";
          } else if (enteredQty > balanceQty) {
            alert(
              `GRN Qty cannot exceed Balance Qty (${balanceQty}) for ${item.itemDescription}`
            );
            item.grnQty = "";
          } else {
            item.grnQty = enteredQty.toString();
          }
        }
      } else {
        item[field] = value;
      }

      updatedItems[index] = item;
      return updatedItems;
    });
  };

  const fetchGRNDetails = (grnNo) => {
    // Example response for modal
    return {
      Header: {
        grnno: grnNo,
        grndate: "2025-08-31T00:00:00",
        suppliername: "ABC Suppliers Pvt Ltd",
        POConcat: "PO123, PO124, PO125",
      },
      Details: [
        {
          pono: "PO123",
          itemDescription: "Steel Rod",
          UOM: "KG",
          dono: "DO456",
          dodate: "2025-08-28T00:00:00",
          poqty: 100,
          alreadyrecqty: 20,
          oribalanceqty: 80,
          grnQty: 50,
          containerno: "C1234",
        },
        {
          pono: "PO124",
          itemDescription: "Iron Sheet",
          UOM: "PCS",
          dono: "DO457",
          dodate: "2025-08-29T00:00:00",
          poqty: 200,
          alreadyrecqty: 100,
          oribalanceqty: 100,
          grnQty: 80,
          containerno: "C5678",
        },
      ],
    };
  };

  // const showGRNDetails = (grnNo) => {
  //   const detail = fetchGRNDetails(grnNo); // Replace with API call
  //   setSelectedDetail(detail);
  //   setDetailVisible(true);
  // };

  const handleShowDetails = async (row) => {
    const res = await GetGRNById(row.grnId, orgId, branchId); // GRN API
    if (res.status) {
      let details = res.data.Details || [];

      // Collect unique PO numbers for header concat
      let headerPONumbers = [
        ...new Set(details.map((d) => d.pono).filter(Boolean)),
      ].join(", ");

      if (!headerPONumbers) headerPONumbers = "NA";

      setSelectedDetail({
        ...res.data,
        Header: {
          ...res.data.Header,
          POConcat: headerPONumbers, // header field with PO numbers
        },
        Details: details, // detail lines from API
      });

      setDetailVisible(true);
    } else {
      Swal.fire("Error", "Data is not available", "error");
    }
  };

  // const handleIRNSave = async (values, spcFlag = false) => {

  //   // console.log('values > ',values);
  //   // return;
  //   try {
  //     // Pick only selected rows
  //     const filteredItems = values.items.filter((item) =>
  //       selectedItems.includes(item.grnId)
  //     );

  //     if (filteredItems.length === 0) {
  //       Swal.fire("Warning", "Please select at least one row to save", "warning");
  //       return;
  //     }

  //     const userData =getUserDetails();

  //     // Map into backend payload format
  //     const payload = {
  //       item: filteredItems.map((row) => ({
  //         receiptnote_hdr_id: row.receiptnote_hdr_id || 0,
  //         grnid: row.grnId,
  //         supplierid: row.supplierId,
  //         invoiceno: row.invoiceNo || "",
  //         invoicedate: searchFormatDate(row.invoiceDate) || "",
  //         duedate: searchFormatDate(row.dueDate) || "",
  //         paymenttermid: "0", // if you don’t have it yet, send ""
  //         filepath: "", // first file if available
  //         filename: "",
  //         spc: true,
  //         isactive: true,
  //         createdby: userData?.u_id || 0, // replace with your logged in user
  //         createdip: "", // replace with real IP if available
  //         modifiedip: "",
  //         branchid: branchId,
  //         orgid: orgId,
  //       })),
  //     };

  //     console.log("🚀 Save Payload:", payload);

  //     // const res = await SaveAddIRNGRNDet(payload);

  //     const res = spcFlag
  //         ? await GenerateSPC(payload)
  //         : await SaveAddIRNGRNDet(payload);

  //         if (res?.status) {
  //         Swal.fire(
  //           "Success",
  //           spcFlag ? "SPC generated successfully!" : "IRN saved successfully!",
  //           "success"
  //         );

  //         history.push({ pathname: "/InvoiceReceipt" });
  //         setInitialValues({ items: [] });
  //         setSelectedItems([]);
  //       } else {
  //         Swal.fire("Error", res?.message || "Operation failed", "error");
  //       }
  //   } catch (error) {
  //     console.error("❌ Error saving IRN:", error);
  //     Swal.fire("Error", "Something went wrong while saving", "error");
  //   }
  // };

  const handleIRNSave = async (values, spcFlag = false) => {
    if (isApiSavingRef.current) return;

    // 1️⃣ Filter only selected rows
    const filteredItems = values.items.filter((item) =>
      selectedItems.includes(item.grnId)
    );

    if (filteredItems.length === 0) {
      Swal.fire("Warning", "Please select at least one row to save", "warning");
      return;
    }

    try {
      isApiSavingRef.current = true;
      isSavingRef.current = true;
      setIsSaving(true);

      console.log('values > ', values)
      const userData = getUserDetails();

      console.log('filteredItems > ', filteredItems)

      const parseAmount = (value) => {
        if (!value) return 0;
        // Remove commas and convert to number
        let num = parseFloat(String(value).replace(/,/g, ""));
        // Keep exact decimal, no truncation
        return num;
      };

      // 2️⃣ Map payload for Save / SPC API
      const payload = {
        item: filteredItems.map((row) => ({
          receiptnote_hdr_id: row.receiptnote_hdr_id || 0,
          grnid: row.grnId,
          poid: row.poid || 0,
          modeOfPaymentId: row.modeOfPaymentId || 0,
          supplierid: row.supplierId,
          invoiceno: row.invoiceNo || "",
          invoicedate: searchFormatDate(row.invoiceDate) || "",
          receipt_Date: searchFormatDate(row.irnDate) || "",
          duedate: searchFormatDate(row.dueDate) || "",
          balance_payment: parseAmount(row.balanceAmount),
          po_amount: parseAmount(row.poAmount),
          adv_payment: parseAmount(row.allocated),
          alreadyrecivedamount: parseAmount(row.alreadyReceived),
          balancepaymentamount: parseAmount(row.advancePayment),
          paymenttermid: "0",
          filepath: "", // attachments handled separately
          filename: "",
          spc: spcFlag, // true if SPC
          isactive: true,
          createdby: userData?.u_id || 0,
          createdip: "", // optional IP
          modifiedip: "",
          branchid: branchId,
          orgid: orgId,
        })),
      };

      console.log("🚀 Save Payload:", payload);

      // return;

      // 3️⃣ Call Save or SPC API
      const res = spcFlag
        ? await GenerateSPC(payload)
        : await SaveAddIRNGRNDet(payload);

      if (!res?.status) {
        Swal.fire("Error", res?.message || "Operation failed", "error");
        isApiSavingRef.current = false;
        isSavingRef.current = false;
        setIsSaving(false);
        return;
      }

      // 4️⃣ Upload attachments for each item
      for (const item of filteredItems) {
        if (item.attachments?.length > 0) {
          const uploadStatus = await uploadIRNAttachment({
            files: item.attachments,
            grnId: item.poid,
            branchId,
            userId: userData?.u_id,
          });

          if (!uploadStatus) {
            console.warn(`Attachment upload failed for GRN: ${item.grnNo}`);
          }
        }
      }

      // 5️⃣ Success alert
      Swal.fire(
        "Success",
        spcFlag ? "SPC generated successfully!" : "IRN saved successfully!",
        "success"
      );

      // 6️⃣ Clear selections and reset Formik
      setInitialValues({ items: [] });
      setSelectedItems([]);

      isApiSavingRef.current = false;
      isSavingRef.current = false;
      setIsSaving(false);

      // Navigate back to Invoice Receipt page
      history.push({ pathname: "/InvoiceReceipt" });

    } catch (error) {
      console.error("❌ Error saving IRN:", error);
      Swal.fire("Error", "Something went wrong while saving", "error");
      isApiSavingRef.current = false;
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };


  const handleSaveClick = async () => {
    if (isSaving || isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);

    if (!formikRef.current) {
      isSavingRef.current = false;
      setIsSaving(false);
      return;
    }

    // Trigger validation manually
    const errors = await formikRef.current.validateForm();

    // Check if any selected row has validation errors
    let hasErrors = false;
    if (errors.items) {
      selectedItems.forEach((grnId) => {
        const index = formikRef.current.values.items.findIndex(
          (item) => item.grnId === grnId
        );
        if (index !== -1 && errors.items[index]) {
          hasErrors = true;
        }
      });
    }

    if (hasErrors) {
      // Touch fields and submit to show validation errors in the UI
      formikRef.current.submitForm();
      isSavingRef.current = false;
      setIsSaving(false);
      return;
    }

    // No errors, show confirmation popup
    Swal.fire({
      title: `Are you sure you want to ${isEditMode ? "Update" : "Save"}?`,
      text: `This will ${isEditMode ? "update" : "save"} the Invoice Receipt Note.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: isEditMode ? "Update" : "Save",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result.isConfirmed) {
        handleIRNSave(formikRef.current.values);
      } else {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    });
  };


  const handleGenerateSPC = async () => {
    if (isSaving || isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);

    if (!formikRef.current) {
      isSavingRef.current = false;
      setIsSaving(false);
      return;
    }

    // Trigger validation and wait for it
    await formikRef.current.validateForm();

    const errors = formikRef.current.errors;

    // Check if any selected row has validation errors
    let hasErrors = false;

    selectedItems.forEach((grnId) => {
      const index = formikRef.current.values.items.findIndex(
        (item) => item.grnId === grnId
      );
      if (index !== -1 && errors.items?.[index]) {
        hasErrors = true;
      }
    });

    if (hasErrors) {
      formikRef.current.submitForm();
      Swal.fire(
        "Warning",
        "Please fix validation errors in selected rows before generating SPC",
        "warning"
      );
      isSavingRef.current = false;
      setIsSaving(false);
      return;
    }

    // No errors for selected rows, show confirmation popup
    Swal.fire({
      title: "Are you sure you want to Generate SPC?",
      text: "This will generate the Supplier Payment Claim.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Generate",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result.isConfirmed) {
        handleIRNSave(formikRef.current.values, true);
      } else {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    });
  };

  const attachmentNameTemplate = (rowData) => {
    const handleDownload = (e) => {
      e.preventDefault();
      let fullPath = rowData.filepath;
      if (!fullPath.endsWith('/') && !fullPath.endsWith('\\')) {
        fullPath += '/';
      }
      fullPath += rowData.filename;
      DownloadInvoiceReceiptFile(rowData.receiptnote_hdr_id, fullPath);
    };

    return (
      <a
        href="#"
        onClick={handleDownload}
        style={{ cursor: "pointer", color: "#007bff", textDecoration: "underline" }}
      >
        {rowData.filename}
      </a>
    );
  };

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Procurement" breadcrumbItem="Invoice Receipt Note" />
        <Row>
          <Col lg="12">
            <Card>
              <CardBody>
                <div>
                  <div className="row align-items-center g-3 justify-content-end mb-3">
                    <div className="col-md-12 button-items d-flex gap-2 justify-content-end">

                       <button
                        type="button"
                        className="btn btn-info"
                        onClick={handleSaveClick}
                        disabled={isRestrictedUser || isSaving}
                      >
                        <i className="bx bx-comment-check label-icon font-size-16 align-middle me-2" ></i>{isEditMode ? "Update" : "Save"}

                      </button>
                      <button type="button" className="btn btn-primary me-2" onClick={handleGenerateSPC} title="Generate Supplier Payment Claim" disabled={isRestrictedUser || isSaving}>
                        <i className="bx bxs-file label-icon font-size-16 align-middle me-2"></i>Generate SPC
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={handleCancel}
                      >
                        <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>
                        Close
                      </button>

                    </div>
                  </div>

                  <Row className="mb-3 align-items-end">
                    <Col md="3">
                      <FormGroup>
                        <Label>GRN From Date</Label>
                        <Flatpickr
                          className="form-control"
                          value={dueFromDate || null}
                          onChange={(date) => setDueFromDate(date[0])}
                          options={{
                            altInput: true,
                            altFormat: "d-M-Y",
                            dateFormat: "Y-m-d",
                          }}
                        />
                      </FormGroup>
                    </Col>

                    <Col md="3">
                      <FormGroup>
                        <Label>GRN To Date</Label>
                        <Flatpickr
                          className="form-control"
                          value={dueToDate || null}
                          onChange={(date) => setDueToDate(date[0])}
                          options={{
                            altInput: true,
                            altFormat: "d-M-Y",
                            dateFormat: "Y-m-d",
                          }}
                        />
                      </FormGroup>
                    </Col>

                    <Col md="2">
                      <FormGroup>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleSearch(dueFromDate, dueToDate)}
                        >
                          <i className="bx bx-search-alt align-middle me-1"></i> Search
                        </button>
                      </FormGroup>
                    </Col>
                  </Row>
                </div>
                <Formik
                  innerRef={formikRef}
                  initialValues={initialValues}
                  validationSchema={validationSchema(selectedItems)}
                  enableReinitialize
                  onSubmit={(values) => {
                    if (isSaving || isSavingRef.current) return;

                    isSavingRef.current = true;
                    setIsSaving(true);

                    Swal.fire({
                      title: `Are you sure you want to ${isEditMode ? "Update" : "Save"}?`,
                      text: `This will ${isEditMode ? "update" : "save"} the Invoice Receipt Note.`,
                      icon: "warning",
                      showCancelButton: true,
                      confirmButtonText: isEditMode ? "Update" : "Save",
                      cancelButtonText: "Cancel"
                    }).then((result) => {
                      if (result.isConfirmed) {
                        handleIRNSave(values);
                      } else {
                        isSavingRef.current = false;
                        setIsSaving(false);
                      }
                    });
                  }}
                >
                  {({ values, errors, touched, setFieldValue, handleSubmit }) => (
                    <Form>

                      <div className="table-responsive" style={{ overflowX: "auto" }}>
                        <table className="table" style={{ minWidth: "1800px" }}>
                          <thead>
                            <tr>
                              <th>S.No</th>
                              <th style={{ width: "6%" }}>IRN Date</th>
                              <th>Supplier</th>
                              <th>PO No.</th>
                              <th>GRN No.</th>
                              <th style={{ width: "6%" }}>Invoice No.</th>

                              <th style={{ width: "6%" }}>Invoice Date</th>
                              <th style={{ width: "6%" }}>Due Date</th>
                              <th style={{ width: "10%" }}>Mode of Payment</th>

                              <th style={{ width: "10%" }}>PO Amt</th>
                              <th style={{ width: "10%" }}>Advance Payment</th>
                              <th style={{ width: "10%" }}>Already Received</th>
                              <th style={{ width: "10%" }}>Allocated Amt</th>
                              <th style={{ width: "10%" }}>Balance Amt</th>
                              <th>Upload Invoice</th>
                              <th style={{ width: "20px" }}>
                                <input
                                  type="checkbox"
                                  checked={selectedItems.length === initialValues.items.length && initialValues.items.length > 0}
                                  onChange={handleSelectAll}
                                />
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {values?.items.map((item, index) => (
                              <tr key={index}>
                                <td>{index + 1}</td>
                                <td>
                                  <Flatpickr
                                    className={`form-control ${errors.items?.[index]?.irnDate && touched.items?.[index]?.irnDate
                                      ? "is-invalid"
                                      : ""
                                      }`}
                                    value={item.irnDate || null}
                                    placeholder="DD-MM-YYYY"
                                    onChange={(date) => {
                                      setFieldValue(`items[${index}].irnDate`, date[0]);
                                      handleIRNDateChange(date[0], index, setFieldValue, values);
                                    }}
                                    options={{
                                      altInput: true,
                                      altFormat: "d-M-Y",
                                      dateFormat: "Y-m-d",
                                      minDate: item.grnDate ? new Date(item.grnDate) : null,
                                    }}
                                  />
                                  <ErrorMessage
                                    name={`items[${index}].irnDate`}
                                    component="div"
                                    className="invalid-feedback"
                                  />
                                </td>
                                <td>{item.supplierName}</td>
                                {/* PO No → Link */}
                                <td style={{ whiteSpace: "nowrap" }}>{item.pono}</td>
                                {/* GRN No → Link */}
                                <td>
                                  {item.grnNo && typeof item.grnNo === 'string' && item.grnNo.includes(',') ? (
                                    item.grnNo.split(',').map((gn, i) => {
                                      const ids = item.grnId ? String(item.grnId).split(',') : [];
                                      const gId = ids[i] ? ids[i].trim() : item.grnId;
                                      return (
                                        <React.Fragment key={i}>
                                          {i > 0 && ", "}
                                          <a
                                            href="#"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              handleShowDetails({ ...item, grnId: gId, grnNo: gn.trim() });
                                            }}
                                            style={{ textDecoration: "underline", cursor: "pointer" }}
                                          >
                                            {gn.trim()}
                                          </a>
                                        </React.Fragment>
                                      );
                                    })
                                  ) : (
                                    <a
                                      href="#"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleShowDetails(item);
                                      }}
                                      style={{ textDecoration: "underline", cursor: "pointer" }}
                                    >
                                      {item.grnNo}
                                    </a>
                                  )}
                                </td>

                                {/* Invoice No */}
                                <td>
                                  <Input
                                    name={`items[${index}].invoiceNo`}
                                    maxLength="20"
                                    value={values.items[index].invoiceNo || ""}
                                    onChange={(e) => setFieldValue(`items[${index}].invoiceNo`, e.target.value)}
                                    invalid={!!(errors.items?.[index]?.invoiceNo && touched.items?.[index]?.invoiceNo)}
                                  />

                                  <ErrorMessage
                                    name={`items[${index}].invoiceNo`}
                                    component="div"
                                    className="invalid-feedback"
                                  />
                                </td>

                                <td>
                                  <Flatpickr
                                    className={`form-control ${errors.items?.[index]?.invoiceDate && touched.items?.[index]?.invoiceDate
                                      ? "is-invalid"
                                      : ""
                                      }`}
                                    value={item.invoiceDate || null}
                                    placeholder="DD-MM-YYYY"
                                    onChange={(date) =>
                                      setFieldValue(
                                        `items[${index}].invoiceDate`,
                                        date[0] // user-selected date
                                      )
                                    }
                                    options={{
                                      altInput: true,
                                      altFormat: "d-M-Y", // display format
                                      dateFormat: "Y-m-d", // internal value YYYY-MM-DD
                                    }}
                                  />
                                  <ErrorMessage
                                    name={`items[${index}].invoiceDate`}
                                    component="div"
                                    className="invalid-feedback"
                                  />
                                </td>

                                {/* Due Date */}
                                <td>
                                  <Flatpickr
                                    className={`form-control ${errors.items?.[index]?.dueDate && touched.items?.[index]?.dueDate
                                      ? "is-invalid"
                                      : ""
                                      }`}
                                    value={item.dueDate || null}
                                    placeholder="DD-MM-YYYY"
                                    onChange={(date) =>
                                      setFieldValue(
                                        `items[${index}].dueDate`,
                                        date[0] // user-selected date
                                      )
                                    }
                                    options={{
                                      altInput: true,
                                      altFormat: "d-M-Y",
                                      dateFormat: "Y-m-d",
                                    }}
                                  />
                                  <ErrorMessage
                                    name={`items[${index}].dueDate`}
                                    component="div"
                                    className="invalid-feedback"
                                  />
                                </td>
                                <td>
                                  <Select
                                    className={` ${errors.items?.[index]?.modeOfPaymentId && touched.items?.[index]?.modeOfPaymentId
                                      ? "is-invalid"
                                      : ""
                                      }`}

                                    name={`items[${index}].modeOfPaymentId`}
                                    options={modeOfPaymentOptions}
                                    value={
                                      modeOfPaymentOptions.find(
                                        (opt) => opt.value === values.items[index].modeOfPaymentId
                                      ) || null
                                    }
                                    placeholder="Select"
                                    onChange={(selected) => {
                                      setFieldValue(`items[${index}].modeOfPaymentId`, selected?.value || 0);
                                    }}
                                    menuPortalTarget={document.body} // avoid dropdown clipping inside table
                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                  />
                                  <ErrorMessage
                                    name={`items[${index}].modeOfPaymentId`}
                                    component="div"
                                    className="invalid-feedback"
                                  />
                                </td>

                                <td style={{ textAlign: "right" }}>
                                  {/* {values.items[index].poAmount || "0.00"} */}
                                  {values.items[index].poAmount}
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  {/* {values.items[index].advancePayment || "0.00"} */}
                                  {/* {parseFloat(values.items[index].advancePayment || 0).toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                  })} */}

                                  {values.items[index].advancePayment}
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  {/* {values.items[index].alreadyReceived || "0.00"} */}
                                  {/* {parseFloat(values.items[index].alreadyReceived || 0).toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                  })} */}

                                  {values.items[index].alreadyReceived}
                                </td>
                                <td>
                                  <Input
                                    style={{ textAlign: "right" }}
                                    name={`items[${index}].balanceAmount`}
                                    value={values.items[index].balanceAmount ?? ""}
                                    placeholder="0.00"
                                    onChange={(e) => {
                                      let input = e.target;
                                      let raw = input.value.replace(/,/g, "");
                                      if (!/^\d*(\.\d{0,3})?$/.test(raw)) return;


                                      setFieldValue(`items[${index}].balanceAmount`, raw);
                                    }}

                                    onBlur={(e) => {
                                      const raw = String(e.target.value || "").replace(/,/g, "");
                                      const enteredBalance = parseFloat(raw) || 0;

                                      const parseNum = (v) => parseFloat(String(v || "0").replace(/,/g, "")) || 0;

                                      const poAmt = parseNum(values.items[index].poAmount);
                                      const adv = parseNum(values.items[index].advancePayment);
                                      const already = parseNum(values.items[index].alreadyReceived);
                                      const oribal = parseNum(values.items[index].oribal);

                                      // system balance = PO - (Advance + Already)
                                      const systemBalance = poAmt - (adv + already);
                                      debugger;
                                      // allocated = systemBalance - enteredBalance
                                      let allocate = systemBalance - enteredBalance;
                                      if (allocate < 0) allocate = 0;

                                      // Format Balance and Allocated with commas only (keep decimals as typed)
                                      const formatWithCommas = (num) => {
                                        if (!num && num !== 0) return "";
                                        const [intPart, decPart] = num.toString().split(".");
                                        const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                                        return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
                                      };

                                      setFieldValue(`items[${index}].balanceAmount`, formatWithCommas(enteredBalance));
                                      setFieldValue(`items[${index}].allocated`, formatWithCommas(allocate));
                                    }}
                                    invalid={
                                      !!(
                                        errors.items?.[index]?.balanceAmount &&
                                        touched.items?.[index]?.balanceAmount
                                      )
                                    }
                                  />

                                  <ErrorMessage
                                    name={`items[${index}].balanceAmount`}
                                    component="div"
                                    className="invalid-feedback"
                                  />
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  {/* {values.items[index].allocated || "0.00"} */}
                                  {/* {parseFloat(values.items[index].allocated || 0).toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                  })} */}
                                  {values.items[index].allocated}
                                </td>

                                {/* Upload Invoice */}
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() => handleOpenUpload(index, values)}
                                  >
                                    <i className="fa fa-paperclip label-icon font-size-14 align-middle"></i>{" "}
                                    Attach
                                  </button>

                                  {item.attachments?.length > 0 && (
                                    <span className="badge bg-success ms-2">
                                      {item.attachments.length} file(s)
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <input
                                    type="checkbox"
                                    value={item.grnId}
                                    checked={selectedItems.includes(item.grnId)}
                                    onChange={(e) => handleCheckBoxChange(e, item)}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <Modal isOpen={showModal} toggle={toggleModal}>
                        <ModalHeader toggle={toggleModal}>Upload Invoice</ModalHeader>
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
                                  <li
                                    key={index}
                                    className="d-flex justify-content-between align-items-center mb-1"
                                  >
                                    {file.name}
                                    <span
                                      onClick={() => removeAttachment(index, "new")}
                                      style={{ cursor: "pointer" }}
                                      title="Remove"
                                    >
                                      <i className="mdi mdi-trash-can-outline" style={{ fontSize: "1.5rem" }}></i>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Existing Files List */}
                          {existingFiles.length > 0 && (
                            <div>
                              <DataTable value={existingFiles} responsiveLayout="scroll">
                                <Column
                                  header="#"
                                  body={(_, { rowIndex }) => rowIndex + 1}
                                  style={{ width: "50px" }}
                                />
                                <Column header="Attachment" body={attachmentNameTemplate} />
                              </DataTable>
                            </div>
                          )}
                        </ModalBody>
                        <ModalFooter>
                          <Button color="primary" onClick={() => handleSaveAttachments(setFieldValue)}>
                            Ok
                          </Button>
                          <Button color="secondary" onClick={toggleModal}>
                            Close
                          </Button>
                        </ModalFooter>
                      </Modal>
                    </Form>
                  )}
                </Formik>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
      <Modal isOpen={detailVisible} toggle={() => setDetailVisible(false)} size="xl">
        <ModalHeader toggle={() => setDetailVisible(false)}>GRN Details</ModalHeader>
        <ModalBody>
          {selectedDetail && (
            <>
              {/* GRN Header Section */}
              <Row form>
                {[
                  ["GRN No.", selectedDetail.Header?.grnno],
                  ["GRN Date", selectedDetail.Header?.grndate?.split("T")[0]],
                  ["Supplier", selectedDetail.Header?.suppliername],
                  ["PO No(s).", selectedDetail.Header?.POConcat], // concat of all POs
                ].map(([label, val], i) => (
                  <Col md="4" key={i} className="form-group row">
                    <Label className="col-sm-5 col-form-label bold">{label}</Label>
                    <Col sm="7" className="mt-2">: {val}</Col>
                  </Col>
                ))}
              </Row>

              <hr />

              {/* GRN Details Table */}
              <DataTable value={selectedDetail.Details}>
                <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                <Column field="pono" header="PO No." />
                <Column field="itemDescription" header="Item Description" />
                <Column field="UOM" header="UOM" />
                <Column field="dono" header="DO No." />
                <Column field="dodate" header="DO Date" body={(row) => row.dodate?.split("T")[0]} />
                <Column field="poqty" header="PO Qty" body={(row) => parseFloat(row.poqty || 0).toLocaleString("en-US")} />
                <Column field="alreadyrecqty" header="Recd Qty" body={(row) => parseFloat(row.alreadyrecqty || 0).toLocaleString("en-US")} />
                <Column field="oribalanceqty" header="Bal Qty" body={(row) => parseFloat(row.oribalanceqty || 0).toLocaleString("en-US")} />
                <Column field="grnQty" header="GRN Qty" body={(row) => parseFloat(row.grnQty || 0).toLocaleString("en-US")} />
                <Column field="containerno" header="Contnr No." />
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
    </div>
  );

  // const header = ()=>{
  //   return (
  //       <div className="w-100 p-2">
  //         {/* First row: Supplier + Category + Dropdowns */}
  //         <Row className="mb-2 align-items-center">

  //         <Col md="2">
  //   <label className="form-label fw-bold">Category</label>
  //   <Select
  //     value={{ label: category, value: category }}
  //     onChange={(opt) =>{ setCategory(opt.value);  setInvoices([]);}}
  //     options={[
  //       { label: "PO", value: "PO" },
  //       { label: "GRN", value: "GRN" }
  //     ]}
  //     placeholder="Select Category"
  //     menuPortalTarget={document.body}
  //   />
  // </Col>

  //         <Col md="3">
  //   <label className="form-label fw-bold">Supplier</label>
  //   <Select
  //   name="Supplier"
  //   id="Supplier"
  //   value={suppliers?.find(opt => opt.value === supplier) || null}
  //   onChange={(opt) => {
  //     setSupplier(opt.value);
  //     setSelectedPOs([]);      // reset POs when supplier changes
  //     setSelectedGRNs([]);     // reset GRNs when supplier changes
  //     loadpo(opt.value);
  //     loadgrn(opt.value);
  //   }}
  //   menuPortalTarget={document.body}
  //   options={Array.isArray(suppliers) ? suppliers?.map(sup => ({
  //     value: sup.value,
  //     label: sup.label


  // })) : []
  // }

  //   // options={suppliers|| []}
  //   placeholder="Select Supplier"
  // />
  // </Col>



  //           <Col md="3">
  //   {category === "PO" && (
  //     <>
  //       <label className="form-label fw-bold">PO #</label>

  //       <Select
  //   isMulti
  //   value={poOptions.filter(opt => selectedPOs.includes(opt.value))}
  //   onChange={(opts) => {
  //     const poIds = opts.map(o => o.value);
  //     setSelectedPOs(poIds);
  //     setSelectedGRNs([]); // reset GRNs if PO selected
  //     if(poIds.length==0){
  //       setInvoices([]);
  //     }
  //     if (poIds.length) {
  //       // 🚀 Call load for each PO
  //       poIds.forEach(poId => load(supplier, poId, 1,poIds));
  //     }
  //   }}
  //   menuPortalTarget={document.body}
  //   options={poOptions}
  //   placeholder="Select PO Numbers"
  // />

  //     </>
  //   )}
  //   {category === "GRN" && (
  //     <>
  //       <label className="form-label fw-bold">GRN #</label>


  // <Select
  //   isMulti
  //   value={grnOptions.filter(opt => selectedGRNs.includes(opt.value))}
  //   onChange={(opts) => {
  //     const grnIds = opts.map(o => o.value);
  //     setSelectedGRNs(grnIds);
  //     setSelectedPOs([]); // reset POs if GRN selected
  //     if(grnIds.length==0){
  //       setInvoices([]);
  //     }
  //     if (grnIds.length) {
  //       // 🚀 Call load for each GRN
  //       grnIds.forEach(grnId => load(supplier, grnId, 2,grnIds));
  //     }
  //   }}
  //   menuPortalTarget={document.body}
  //   options={grnOptions}
  //   placeholder="Select GRN Numbers"
  // />
  //     </>
  //   )}
  // </Col>

  //           <Col md="4" className="text-end mt-4">

  //           <button type="button" className="btn btn-success   me-2" onClick={()=>{handleSave(0)}}>
  //          <i className="bx bxs-save label-icon font-size-16 align-middle me-2"></i>  {isEditMode ? "Update" : "Save"}
  //          </button>

  //          <button type="button" className="btn btn-primary me-2" onClick={()=>{handleSave(1)}}>
  //          <i className="bx bxs-file label-icon font-size-16 align-middle me-2"></i>Generate
  //          </button>
  //          <button type="button" className="btn btn-danger fa-pull-right" onClick={handleCancel}>
  //                                                             <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>Close</button>


  //             {/* <Button label="Save" icon="pi pi-save" className="p-button-success me-2" /> */}
  //             {/* <Button label="Generate" icon="pi pi-cog" className="p-button-primary" /> */}
  //           </Col>
  //         </Row>
  //       </div>
  //     )
  // };


  //   return (
  //     <div className="page-content">
  //       <Container fluid>
  //         <Breadcrumbs title="Procurement" breadcrumbItem="Invoice Receipt Note" />
  //         <Row>
  //         <Col lg="12">
  //         <Card>
  //           {header()}
  //           </Card>
  //           </Col>
  //           </Row>
  //         <Row>
  //           <Col lg="12">

  //             <Card>
  //               <CardBody>

  //               <DataTable editMode="cell"
  //   value={parentRows}
  //   dataKey="id"

  //   expandedRows={expandedRows}
  //   onRowToggle={(e) => setExpandedRows(e.data)}
  //   rowExpansionTemplate={rowExpansionTemplate}
  //     className="parent-table"
  //   onRowEditComplete={(e) => {
  //     debugger;
  //     let _rows = [...parentRows];
  //     _rows[e.index] = e.newData;
  //     setParentRows(_rows);
  //   }}
  // >
  // <Column
  //   body={(rowData) => (
  //     <Button
  //       icon={expandedRows?.[rowData.id] ? "pi pi-chevron-down" : "pi pi-chevron-right"}
  //       className="p-button-text p-button-sm"
  //       style={{ color: expandedRows?.[rowData.id] ? "red" : "green" }}
  //       onClick={() => {
  //         let _expanded = { ...expandedRows };
  //         if (_expanded[rowData.id]) delete _expanded[rowData.id];
  //         else _expanded[rowData.id] = true;
  //         setExpandedRows(_expanded);
  //       }}
  //     />
  //   )}
  //   style={{ width: "3rem" }}
  // />


  // {category === "PO" && <Column field="poNo" header="PO #" />}
  //   {category === "GRN" && <Column field="grnNo" header="GRN #" />}




  //   <Column
  //     field="invoiceNo"
  //     header="Inv #"
  //     style={{ width: "180px" }}
  //     editor={(options) => (
  //       <InputText
  //         value={options.value}
  //         onChange={(e) =>{ options.editorCallback(e.target.value);
  //           const newValue = e.target.value;
  //           setInvoices((prev) => {
  //             const updated = [...prev];
  //             updated[options.rowIndex].invoiceNo = newValue;
  //             return updated;
  //           });
  //         }
  //         }
  //         style={{ width: "100%", fontSize: "12px", height: "28px" }}
  //       />
  //     )}
  //   />

  //   <Column
  //     field="invoiceDate"
  //     header="Inv Dt"
  //     style={{ width: "180px" }}

  //     body={(r) => formatDate(r.invoiceDate)}
  //     inputStyle={{ height: "28px", fontSize: "12px" }}

  //     editor={(options) => (
  //       <Calendar
  //         value={options.value}
  //         onChange={(e) =>
  //           {

  //             options.editorCallback(e.value)
  //             const newValue = e.target.value;
  //             setInvoices((prev) => {
  //               const updated = [...prev];
  //               updated[options.rowIndex].invoiceDate = newValue;
  //               return updated;
  //             });
  //           }}
  //         dateFormat="dd-M-yy"

  //         style={{ width: "100%", fontSize: "12px" }}
  //         inputStyle={{  fontSize: "12px" }}
  //       />
  //     )}
  //   />

  //   <Column
  //     field="dueDate"
  //     header="Due Date"

  //     style={{ width: "180px" }}
  //     inputStyle={{ height: "28px", fontSize: "12px" }}
  //     body={(r) => formatDate(r.dueDate)}
  //     editor={(options) => (
  //       <Calendar
  //         value={options.value}
  //         onChange={(e) =>{ options.editorCallback(e.value)

  //           const newValue = e.target.value;
  //           setInvoices((prev) => {
  //             const updated = [...prev];
  //             updated[options.rowIndex].dueDate = newValue;
  //             return updated;
  //           });
  //         }}
  //         dateFormat="dd-M-yy"

  //         style={{ width: "100%", fontSize: "12px" }}
  //         inputStyle={{   fontSize: "12px" }}
  //       />
  //     )}
  //   />
  //  <Column header="Upload Inv" body={(r) => uploadBody(r)} />
  //  <Column
  //   header="SPC"
  //   body={(rowData, options) => (
  //     <input
  //       type="checkbox"
  //       checked={rowData.spc === 1}
  //       onChange={(e) => {
  //         const newValue = e.target.checked ? 1 : 0;

  //         setInvoices((prev) =>
  //           prev.map((inv, idx) =>
  //             idx === options.rowIndex
  //               ? { ...inv, spc: newValue }
  //               : inv
  //           )
  //         );
  //       }}
  //     />
  //   )}
  // />

  // <Column
  //   field="spc"
  //   header="SPC"
  //   style={{ width: "120px" }}
  //   body={(rowData) =>{   console.log(rowData); return (rowData.spc === true ? "Yes" : "No")}} // display
  //   editor={(options) => (
  //     <InputSwitch
  //       checked={options.value === true}
  //       onChange={(e) => {

  //         const newValue = e.target.value;

  //         setInvoices((prev) => {
  //           const updated = [...prev];
  //           updated[options.rowIndex].spc = newValue;
  //           return updated;
  //         });
  //   // ✅ Update DataTable cell
  //   options.editorCallback(newValue);

  // }}
  // />
  // )}
  // />




  // </DataTable>


  //               </CardBody>
  //             </Card>
  //           </Col>
  //         </Row>
  //       </Container>
  //     </div>
  //   );
};

export default AddInvoiceReceipt;