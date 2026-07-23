
import {
  Col,

  Row,
  Label, Input, InputGroup, Table
} from "reactstrap";
import axios from "axios"; // Added axios
import Breadcrumbs from "../../components/Common/Breadcrumb"
import { Dialog } from 'primereact/dialog';
import { Calendar } from 'primereact/calendar';
import { Tag } from "primereact/tag";
import { RadioButton } from 'primereact/radiobutton';
import { Checkbox } from 'primereact/checkbox';
import React, { useState, useEffect, useRef } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";

import { ColumnGroup } from 'primereact/columngroup';
import "flatpickr/dist/themes/material_blue.css";
import Flatpickr from "react-flatpickr";
import { Container, Card } from "reactstrap";
import { Accordion, AccordionTab } from "primereact/accordion"; // Accordion tabs :contentReference[oaicite:4]{index=4}
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Tooltip } from "primereact/tooltip";
import { Button } from "primereact/button";
import { FilterMatchMode, FilterOperator } from "primereact/api";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { Badge } from 'primereact/badge';
// import PaymentSummaryTable from './PaymentSummaryTable'; // ✅ No curly braces

import {
  Getclaimremarksdetails,
  DownloadFileById, ClaimAndPaymentGetById, GetPurchaseRequisitionApprovals,
  Getclaimhistorydetails, SaveClaimApprove, GetApprovalSettings, ClaimReject, getClaimDetailsById,
  GetPurchaseRequisitionRemarks,
  GetPurchaseRequisitionHistory,
  SavePRApprove,
  GetPurchaseMemoList,
  GetByIdPurchaseRequisition,
  DownloadPurchaseRequisitionFileById,
  SavePRReply
} from "common/data/mastersapi";
import { PYTHON_API_URL } from "../../common/pyapiconfig";

import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { object } from "prop-types";
import { startOfWeek, endOfWeek } from "date-fns";

const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getUserDetails = () => {
  if (localStorage.getItem("authUser")) {
    const obj = JSON.parse(localStorage.getItem("authUser"))
    return obj;
  }
}

const PurchaseRequisitionApproval = ({ selectedType, setSelectedType }) => {
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const types = [
    "Claim Approval",
    "Payment Plan",
    "PPP",
    "PPP Approval"
  ];
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimModalData, setClaimModalData] = useState([]);
  const today = new Date();
  const defaultFromDate = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const defaultToDate = new Date(defaultFromDate);
  defaultToDate.setDate(defaultFromDate.getDate() + 5); // Saturday

  const [gmCommentMap, setGmCommentMap] = useState({});
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyRange, setHistoryRange] = useState({ from: defaultFromDate, to: defaultToDate });
  const [historyForType, setHistoryForType] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState({});
  const [showGmModal, setGmShowModal] = useState(false);
  const [claims, setclaims] = useState([]);
  const [claimsPPP, setclaimsPPP] = useState([]);
  const [roledetails, setroledetails] = useState([]);
  const [historyArray, sethistoryArray] = useState([]);
  const [selectedPPPRows, setSelectedPPPRows] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [showModalPPP, setShowModalPPP] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [action1, setAction1] = useState({});
  const [action2, setAction2] = useState({});
  const [pppAction1, setPPPAction1] = useState({});
  const [pppAction2, setPPPAction2] = useState({});
  const [pppAction3, setPPPAction3] = useState({});

  const [PPPPVAction1, setPPPPVAction1] = useState({});
  const [PPPPVAction2, setPPPPVAction2] = useState({});
  const [UserData, setUserData] = useState(null);

  // Director Discussion State
  const [directorDiscussModal, setDirectorDiscussModal] = useState(false);
  const [directorComments, setDirectorComments] = useState("");
  const [directorReply, setDirectorReply] = useState("");
  const [selectedDirectorClaim, setSelectedDirectorClaim] = useState(null);

  const parseDirectorComments = (rawText) => {
    if (!rawText) return [];
    // If exact format is controlled by backend: [Sender at Timestamp]: ...
    // We can rely on splitting by `\n[` but this assumes no message starts with [ unless it's a header.
    // Safer: Regex match all headers and split.
    // Or just iterate lines if we assume 1 header = 1 line + content.

    // Let's assume standard log format.
    const messages = [];
    const lines = rawText.split('\n');
    let currentMsg = null;

    // Regex matching: [Role at YYYY-MM-DD HH:mm:ss]: Message
    const headerRegex = /^\[(.*?)\s+at\s+(.*?)\]:\s*(.*)/;

    lines.forEach(line => {
      const match = line.match(headerRegex);
      if (match) {
        if (currentMsg) messages.push(currentMsg);
        currentMsg = {
          sender: match[1],
          time: match[2],
          text: match[3]
        };
      } else {
        if (currentMsg) {
          currentMsg.text += "\n" + line;
        } else {
          // Handle content with no header (legacy or simple update)
          if (line.trim()) {
            currentMsg = {
              sender: "GM/User", // Fallback sender
              time: "",
              text: line
            };
          }
        }
      }
    });
    if (currentMsg) messages.push(currentMsg);

    return messages;
  };



  const fetchDirectorComments = async (prId) => {
    try {
      const response = await axios.get(`${PYTHON_API_URL}/procurement/get_director_comments/${prId}`);
      if (response.data && response.data.comments) {
        console.log("Director comments fetched:", response.data.comments);
        setDirectorComments(response.data.comments);
      } else {
        setDirectorComments("");
      }
    } catch (error) {
      console.error("Error fetching director comments:", error);
      setDirectorComments("");
    }
  };

  const handleDirectorDiscuss = (rowData) => {
    console.log("[handleDirectorDiscuss] Called with rowData:", rowData);
    console.log("[handleDirectorDiscuss] Setting selected claim and opening modal");
    setSelectedDirectorClaim(rowData);
    setDirectorComments(""); // Reset before fetching
    setDirectorReply("");
    fetchDirectorComments(rowData.id);
    console.log("[handleDirectorDiscuss] About to set modal to true");
    setDirectorDiscussModal(true);
    console.log("[handleDirectorDiscuss] Modal state updated");
  };

  const handleDirectorSend = async () => {
    if (!selectedDirectorClaim || !directorReply.trim()) return;

    try {
      const isDirector = roledetails?.[0]?.ApproverTwo === 1;
      const payload = {
        pr_id: selectedDirectorClaim.id,
        reply: directorReply,
        name: UserData?.name || "User",
        sender: isDirector ? "Director" : "GM"
      };

      const response = await axios.post(`${PYTHON_API_URL}/procurement/save_director_discussion`, payload);

      if (response.data.success) {
        Swal.fire("Success", "Discussion sent.", "success");
        setDirectorComments(response.data.new_comment);
        setDirectorReply("");

        if (!isDirector) {
          // GM CASE: Remove from UI immediately as it is now actionable by Director (Level 2)
          // The backend API `save_director_discussion` already sets `pr_gm_isapproved=1`.
          setclaims(prev => prev.filter(c => c.id !== selectedDirectorClaim.id));

          // Clean up action states
          setAction1(prev => { const n = { ...prev }; delete n[selectedDirectorClaim.id]; return n; });
          setAction2(prev => { const n = { ...prev }; delete n[selectedDirectorClaim.id]; return n; });

          setDirectorDiscussModal(false);
        } else {
          // DIRECTOR CASE: Update UI to show discussed status
          setclaims(prev => prev.map(c =>
            c.id === selectedDirectorClaim.id
              ? {
                ...c,
                discussedtwo: 1,
                pr_dir_comment: response.data.new_comment
              }
              : c
          ));
          setAction2(prev => ({ ...prev, [selectedDirectorClaim.id]: 'discuss' }));
        }
      }
    } catch (error) {
      console.error("Error sending discussion:", error);
      Swal.fire("Error", "Failed to send discussion.", "error");
    }
  };


  const exportToExcel = () => {
    const allPRs = claims.map(item => ({
      "PR #": item.pr_number,
      "PR Date": item.prdate,

      "Created By": item.createdbyname,
      "PR Type": item.prtype,
      "Supplier": item.SupplierName,
      "Currency": item.CurrencyCode,
      "Net Amount": item.NetAmount,
      "GM Status": item.ApproverOne === 1 ? "Approved" : item.DiscussOne === 1 ? "Discussed" : "Pending",
      "Director Status": item.ApproverTwo === 1 ? "Approved" : item.DiscussTwo === 1 ? "Discussed" : "Pending",
      "Remarks": item.comment || ""
    }));

    // 🔹 Create Excel Sheet
    const worksheet = XLSX.utils.json_to_sheet(allPRs);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PR Approval");

    // 🔹 Convert to buffer & save
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "Purchase_Requisition_Approval.xlsx");
  };


  const [showvoucherModal, setShowvoucherModal] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState(null);

  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [remarksData, setRemarksData] = useState([]);
  const [selectedClaimId, setSelectedClaimId] = useState(null);

  const toggleRemarkModal = () => {
    setRemarkModalOpen(!remarkModalOpen);
  };


  const handleViewRemarks = async (id, rowData) => {
    console.log("[handleViewRemarks] Called with id:", id, "rowData:", rowData);
    try {
      console.log("[handleViewRemarks] Fetching remarks...");
      const res = await GetPurchaseRequisitionRemarks(id);
      console.log("[handleViewRemarks] Response received:", res);

      // Check if remarks exist (array with length)
      if (Array.isArray(res) && res.length > 0) {
        console.log("[handleViewRemarks] Setting remarks with data, opening modal");
        setRemarksData(res);
        setSelectedClaimId(id);
        setSelectedClaim(rowData); // Set the selected row for user reply
        setRemarkModalOpen(true);
      } else {
        // Init empty remarks for new discussion
        console.log("[handleViewRemarks] No remarks found, opening empty modal");
        setRemarksData([]);
        setSelectedClaimId(id);
        setSelectedClaim(rowData);
        setRemarkModalOpen(true);
      }
    } catch (err) {
      console.error("[handleViewRemarks] Error loading remarks:", err);
      // Even on error, allow trying to reply (optional, but safer to just show error or empty)
      Swal.fire("Error", "Failed to fetch remarks.", "error");
    }
  };



  const handleVoucherClick = (voucherId) => {

    setSelectedVoucherId(voucherId);
    setShowvoucherModal(true);
  };

  const handleSaveCommentGm = () => {
    if (selectedClaim?.id) {
      const updatedClaims = claims.map(claim =>
        claim.id === selectedClaim.id
          ? { ...claim, comment: selectedClaim.comment }
          : claim
      );
      setclaims(updatedClaims);

      setAction1(prev => ({
        ...prev,
        [selectedClaim.id]: 'approve',
      }));

      setGmCommentMap(prev => ({
        ...prev,
        [selectedClaim.id]: true,
      }));

      setShowModal(false);
      setGmShowModal(false);
    }
  };
  const togglevoucherModal = () => setShowvoucherModal(!showvoucherModal);

  const handlePVSave = async (summaryid, type) => {
    const payload = {
      approve: {
        approve: [],
        userId: UserData.id,
        orgid: UserData.orgid,
        branchid: UserData.branchid,
        type: type,
        summaryid: summaryid,
        isppp_pv: 1

      },
    };


    try {
      const res = await SaveClaimApprove(payload);
      if (res.status) {
        Swal.fire("Success", "PPP PV approvals saved successfully", "success");
        // Reset actions and reload data
        load();
        setAction1({});
        setAction2({});
        setPPPAction1({});
        setPPPAction2({});
        setPPPAction3({});
        setPPPPVAction1({});
        setPPPPVAction2({});
      } else {
        Swal.fire("Error", res.message || "Something went wrong", "error");
      }
    } catch (error) {
      console.error("Save error:", error);
      Swal.fire("Error", "Failed to save approval data", "error");
    }
  }
  const handleSave = async () => {
    if (!UserData) {
      Swal.fire("Error", "User data not available", "error");
      return;
    }

    // ✅ Filter only PRs where some action was taken
    const modifiedPRs = claims.filter(
      (pr) =>
        action1[pr.id] || // GM/Level 1
        action2[pr.id]    // Director/Level 2
    );

    if (modifiedPRs.length === 0) {
      Swal.fire("Warning", "No PR approvals selected", "warning");
      return;
    }

    // ✅ Build payload for API
    const payload = {
      approve: {
        approve: modifiedPRs.map((pr) => {
          let formattedRemark = pr.comment || "";
          // Auto-format only if there is text and it doesn't look like it already has a header
          if (formattedRemark && !formattedRemark.trim().startsWith("[")) {
            const now = new Date();
            const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            const senderName = UserData?.username || UserData?.name || "GM";
            formattedRemark = `[${senderName} at ${timestamp}]: ${formattedRemark}`;
          }

          return {
            userid: UserData?.u_id,   // current user approving
            prid: pr.id,              // PR id
            isapprovedone: action1[pr.id] === "approve",
            isdiscussedone: action1[pr.id] === "discuss",
            isapprovedtwo: action2[pr.id] === "approve",
            isdiscussedtwo: action2[pr.id] === "discuss",
            remarks: formattedRemark
          };
        }),
        userId: UserData?.u_id,
        orgid: UserData?.orgid,
        branchid: UserData?.branchid
      }
    };

    try {
      const res = await SavePRApprove(payload); // 🔹 your API call
      if (res.status) {
        Swal.fire("Success", "PR approvals saved successfully", "success");
        load();
        setAction1({});
        setAction2({});
      } else {
        Swal.fire("Error", res.message || "Something went wrong", "error");
      }
    } catch (error) {
      console.error("Save error:", error);
      Swal.fire("Error", "Failed to save approval data", "error");
    }
  };

  const GetAccessRights = async () => {
    const res = await GetApprovalSettings(1, 1, 1, 25);
    if (res.status) {
      setroledetails(res.data);
    } else {
      Swal.fire({
        icon: 'error',
        text: res.message || 'No access rights for this page.',
      });
    }
  }


  const load = async () => {
    const res = await GetPurchaseRequisitionApprovals(1, 1, 1, UserData?.u_id);
    if (res.status) {
      // res.data.push(
      //   { isSelected: false, approvedone: 1, discussedone: 0, approvedtwo: 1, discussedtwo: 0, comment: "", type: "PPV", id: 5, claimno: "CLM0000122", date: "25‑Jun‑25", name: "Shafiq", dept: "HR", amount: "376.80", curr: "MYR", transactions: "Txn E" },
      //   { isSelected: false, approvedone: 1, discussedone: 0, approvedtwo: 1, discussedtwo: 0, comment: "", type: "PPV", id: 6, claimno: "CLM0000132", date: "26‑Jun‑25", name: "Sandy", dept: "Sales & Marketing", amount: "433.00", curr: "IDR", transactions: "Txn F" },
      //   { isSelected: false, approvedone: 1, discussedone: 0, approvedtwo: 1, discussedtwo: 0, comment: "", type: "PPV PV", id: 5, claimno: "CLM0000122", date: "25‑Jun‑25", name: "Shafiq", dept: "HR", amount: "376.80", curr: "MYR", transactions: "Txn E" },
      //   { isSelected: false, approvedone: 1, discussedone: 0, approvedtwo: 1, discussedtwo: 0, comment: "", type: "PPV PV", id: 6, claimno: "CLM0000132", date: "26‑Jun‑25", name: "Sandy", dept: "Sales & Marketing", amount: "433.00", curr: "IDR", transactions: "Txn F" });

      setclaims(res.data);
      const initialAction1 = {};
      const initialAction2 = {};
      const initialPPPAction1 = {};
      const initialPPPAction2 = {};
      const initialPPPAction3 = {};

      const initialPPPPVAction1 = {};
      const initialPPPPVAction2 = {};

      res.data.forEach((claim) => {
        // For normal claim approvals (GM)
        if (claim.approvedone) initialAction1[claim.id] = 'approve';
        else if (claim.discussedone) initialAction1[claim.id] = 'discuss';

        // For normal claim approvals (Director)
        if (claim.approvedtwo) initialAction2[claim.id] = 'approve';
        else if (claim.discussedtwo) initialAction2[claim.id] = 'discuss';

        // For PPP approvals (GM)
        if (claim.ppp_gm_approvalone) initialPPPAction1[claim.id] = 'approve';
        else if (claim.ppp_gm_discussedone) initialPPPAction1[claim.id] = 'discuss'; // if you have a discussed flag for PPP GM

        // For PPP approvals (Director)
        if (claim.ppp_director_approvalone) initialPPPAction2[claim.id] = 'approve';
        else if (claim.ppp_director_discussedone) initialPPPAction2[claim.id] = 'discuss'; // if exists

        // For PPP approvals (Commissioner)
        if (claim.ppp_commissioner_approvalone) initialPPPAction3[claim.id] = 'approve';
        else if (claim.ppp_commissioner_discussedone) initialPPPAction3[claim.id] = 'discuss'; // if exists

        // For PPP PV approvals (Commissioner)
        if (claim.PPP_PV_Commissioner_approveone) {
          initialPPPPVAction2[claim.id] = 'approve';
        } else if (claim.ppp_pv_Commissioner_discussedone) {
          initialPPPPVAction2[claim.id] = 'discuss';
        }


        if (claim.PPP_PV_Director_approve) {
          initialPPPPVAction1[claim.id] = 'approve';
        } else if (claim.ppp_pv_Director_discussed) {
          initialPPPPVAction1[claim.id] = 'discuss';
        }


      });
      debugger
      // Set the states accordingly
      setAction1(initialAction1);
      setAction2(initialAction2);
      setPPPAction1(initialPPPAction1);
      setPPPAction2(initialPPPAction2);
      setPPPAction3(initialPPPAction3);


      setPPPPVAction1(initialPPPPVAction1);
      setPPPPVAction2(initialPPPPVAction2);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Initial Load Failed',
        text: res.message || 'Unable to fetch claim approve data.',
      });
    }
  };

  const handlePPPClick1 = (action, id, data) => {
    debugger
    data?.forEach((claim) => {
      if (claim.ppp_IsRejected != 1) {
        setPPPAction1(prev => ({ ...prev, [claim.id]: action }));
      }
    });
  };

  const handlePPPClick2 = (action, id, data) => {
    debugger
    data?.forEach((claim) => {
      if (claim.ppp_IsRejected != 1) {
        setPPPAction2(prev => ({ ...prev, [claim.id]: action }));
      }
    });


  };
  const handlePPPClick3 = (action, id, data) => {


    data?.forEach((claim) => {
      if (claim.ppp_IsRejected != 1) {
        setPPPAction3(prev => ({ ...prev, [claim.id]: action }));
      }
    });

  };




  const handlePPPPVClick3 = (action, id) => {
    setPPPPVAction2(prev => ({ ...prev, [id]: action }));
  };

  const handlePPPPVDirector = (action, id) => {
    setPPPPVAction1(prev => ({ ...prev, [id]: action }));
  };

  useEffect(() => {

    const loadIsadmindetails = async () => {
      const userData = getUserDetails();
      setUserData(userData);
      console.log("userd data", userData);


    }
    loadIsadmindetails();

    // const fetchClaimApprovedDetails = async () => {
    //   const res = await GetPurchaseRequisitionApprovals(1, 1, 1, UserData?.u_id);
    //   if (res.status) {

    //     setclaims(res.data);
    //     const initialAction1 = {};
    //     const initialAction2 = {};
    //     const initialPPPAction1 = {};
    //     const initialPPPAction2 = {};

    //     const initialPPPAction3 = {};
    //     const initialPPPPVAction1 = {};
    //     const initialPPPPVAction2 = {};
    //     res.data.forEach((claim) => {
    //       // For normal claim approvals (GM)
    //       if (claim.approvedone) initialAction1[claim.id] = 'approve';
    //       else if (claim.discussedone) initialAction1[claim.id] = 'discuss';

    //       // For normal claim approvals (Director)
    //       if (claim.approvedtwo) initialAction2[claim.id] = 'approve';
    //       else if (claim.discussedtwo) initialAction2[claim.id] = 'discuss';

    //       // For PPP approvals (GM)
    //       if (claim.ppp_gm_approvalone) initialPPPAction1[claim.id] = 'approve';
    //       else if (claim.ppp_gm_discussedone) initialPPPAction1[claim.id] = 'discuss'; // if you have a discussed flag for PPP GM

    //       // For PPP approvals (Director)
    //       if (claim.ppp_director_approvalone) initialPPPAction2[claim.id] = 'approve';
    //       else if (claim.ppp_director_discussedone) initialPPPAction2[claim.id] = 'discuss'; // if exists



    //       // For PPP approvals (Commissioner)
    //       if (claim.ppp_commissioner_approvalone) initialPPPAction3[claim.id] = 'approve';
    //       else if (claim.ppp_commissioner_discussedone) initialPPPAction3[claim.id] = 'discuss'; // if exists

    //       // For PPP PV approvals (Commissioner)
    //       if (claim.PPP_PV_Commissioner) initialPPPPVAction1[claim.id] = 'approve';

    //       // For PPP PV approvals (Commissioner)
    //       if (claim.PPP_PV_Commissioner_approveone) {
    //         initialPPPPVAction2[claim.id] = 'approve';
    //       } else if (claim.ppp_pv_Commissioner_discussedone) {
    //         initialPPPPVAction2[claim.id] = 'discuss';
    //       }

    //       if (claim.PPP_PV_Director_approve) {
    //         initialPPPPVAction1[claim.id] = 'approve';
    //       } else if (claim.ppp_pv_Director_discussed) {
    //         initialPPPPVAction1[claim.id] = 'discuss';
    //       }

    //     });
    //     // Set the states accordingly
    //     setAction1(initialAction1);
    //     setAction2(initialAction2);
    //     setPPPAction1(initialPPPAction1);
    //     setPPPAction2(initialPPPAction2);

    //     setPPPAction3(initialPPPAction3);
    //     setPPPPVAction1(initialPPPPVAction1);
    //     setPPPPVAction2(initialPPPPVAction2);
    //   } else {
    //     Swal.fire({
    //       icon: 'error',
    //       title: 'Initial Load Failed',
    //       text: res.message || 'Unable to fetch claim approve data.',
    //     });
    //   }
    // };

    // const GetAccessRights =async() =>{
    //   const res = await GetApprovalSettings(UserData?.u_id, 1, 1,27 );
    //   if (res.status) {
    //   setroledetails(res.data);
    //   }else{
    //     Swal.fire({
    //       icon: 'error',
    //       text: res.message || 'No access rights for this page.',
    //   });   
    //   }
    // }
    // GetAccessRights();
    //    fetchClaimApprovedDetails();
  }, []);

  const handleDiscuss = (rowData) => {
    setSelectedClaim(rowData);
    setShowModal(true);
  };

  const handleDiscussPPP = (rowData) => {
    setSelectedClaim(rowData);
    setShowModalPPP(true);
  };
  const handleClickgmapprovan = (action, id, rowData) => {
    debugger;
    if (action === 'approve' && action2[id] === 'discuss') {

      setAction2(prev => ({ ...prev, [id]: 'update' }));

      setSelectedClaim(rowData);
      setGmShowModal(true);
      return;
    }
    setAction1(prev => ({ ...prev, [id]: action }));
  };

  useEffect(() => {
    const GetAccessRights = async () => {
      const res = await GetApprovalSettings(UserData?.u_id, 1, 1, 27);
      if (res.status) {
        setroledetails(res.data);
      } else {
        Swal.fire({
          icon: 'error',
          text: res.message || 'No access rights for this page.',
        });
      }
    };


    const fetchClaimApprovedDetails = async () => {
      const res = await GetPurchaseRequisitionApprovals(1, 1, 1, UserData?.u_id);
      if (res.status) {

        setclaims(res.data);
        const initialAction1 = {};
        const initialAction2 = {};
        const initialPPPAction1 = {};
        const initialPPPAction2 = {};

        const initialPPPAction3 = {};
        const initialPPPPVAction1 = {};
        const initialPPPPVAction2 = {};
        res.data.forEach((claim) => {
          // For normal claim approvals (GM)
          if (claim.approvedone) initialAction1[claim.id] = 'approve';
          else if (claim.discussedone) initialAction1[claim.id] = 'discuss';

          // For normal claim approvals (Director)
          if (claim.approvedtwo) initialAction2[claim.id] = 'approve';
          else if (claim.discussedtwo) initialAction2[claim.id] = 'discuss';

          // // For PPP approvals (GM)
          // if (claim.ppp_gm_approvalone) initialPPPAction1[claim.id] = 'approve';
          // else if (claim.ppp_gm_discussedone) initialPPPAction1[claim.id] = 'discuss'; // if you have a discussed flag for PPP GM

          // // For PPP approvals (Director)
          // if (claim.ppp_director_approvalone) initialPPPAction2[claim.id] = 'approve';
          // else if (claim.ppp_director_discussedone) initialPPPAction2[claim.id] = 'discuss'; // if exists



          // // For PPP approvals (Commissioner)
          // if (claim.ppp_commissioner_approvalone) initialPPPAction3[claim.id] = 'approve';
          // else if (claim.ppp_commissioner_discussedone) initialPPPAction3[claim.id] = 'discuss'; // if exists

          // // For PPP PV approvals (Commissioner)
          // if (claim.PPP_PV_Commissioner) initialPPPPVAction1[claim.id] = 'approve';

          // // For PPP PV approvals (Commissioner)
          // if (claim.PPP_PV_Commissioner_approveone) {
          //   initialPPPPVAction2[claim.id] = 'approve';
          // } else if (claim.ppp_pv_Commissioner_discussedone) {
          //   initialPPPPVAction2[claim.id] = 'discuss';
          // }

          // if (claim.PPP_PV_Director_approve) {
          //   initialPPPPVAction1[claim.id] = 'approve';
          // } else if (claim.ppp_pv_Director_discussed) {
          //   initialPPPPVAction1[claim.id] = 'discuss';
          // }

        });
        // Set the states accordingly
        setAction1(initialAction1);
        setAction2(initialAction2);
        setPPPAction1(initialPPPAction1);
        setPPPAction2(initialPPPAction2);

        setPPPAction3(initialPPPAction3);
        setPPPPVAction1(initialPPPPVAction1);
        setPPPPVAction2(initialPPPPVAction2);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Initial Load Failed',
          text: res.message || 'Unable to fetch claim approve data.',
        });
      }
    };
    if (UserData?.u_id) {
      GetAccessRights();
      fetchClaimApprovedDetails();
    }
  }, [UserData]);


  const handleClick1 = (action, id) => {
    debugger
    setAction1(prev => ({ ...prev, [id]: action }));
  };


  const handleClick2 = (action, id) => {
    debugger
    setAction2(prev => ({ ...prev, [id]: action }));
  };

  const ApproverIndicator = ({ approved, discussed }) => {
    let severity = 'secondary'; // default gray
    if (approved === 1) severity = 'success';
    else if (discussed === 1) severity = 'warning';
    else severity = 'danger';

    const label = approved === 1
      ? 'Approved'
      : discussed === 1
        ? 'Discussed'
        : 'Pending';

    return <Badge style={{ width: "85px", fontSize: "13px", margin: "3px" }} value={label} severity={severity} />;
  };
  const handleSaveComment = () => {
    if (selectedClaim) {
      // Update the comment in the selected claim

      var updatedClaims = "";
      if (selectedClaim?.Claim_Discussed_Count == 2) {
        updatedClaims = claims.map(claim =>
          claim.id === selectedClaim.id
            ? { ...claim, comment: " Cancel The Transaction : " + selectedClaim.comment }
            : claim
        );

      } else {
        updatedClaims = claims.map(claim =>
          claim.id === selectedClaim.id
            ? { ...claim, comment: selectedClaim.comment }
            : claim
        );
      }
      // Update the state with the new claims array
      setclaims(updatedClaims);

      // Optionally, close the modal
      setShowModal(false);
    }
  };



  const handleSaveCommentPPP = () => {
    if (selectedClaim) {
      debugger;

      var updatedClaims = "";
      if (selectedClaim?.PPP_Discussed_Count == 2) {


        updatedClaims = claims.map(claim =>
          claim.SummaryId === selectedClaim.SummaryId && claim.ppp_IsRejected != 1
            ? { ...claim, comment: " Cancel The Transaction : " + selectedClaim.comment }
            : claim
        );

      } else {
        updatedClaims = claims.map(claim =>
          claim.SummaryId === selectedClaim.SummaryId && claim.ppp_IsRejected != 1
            ? { ...claim, comment: selectedClaim.comment }
            : claim
        );
      }



      // Update the state with the new claims array
      //   setclaims(updatedClaims);

      // Optionally, close the modal
      setShowModalPPP(false);
    }
  };

  const headerTemplate = (type) => (
    <div className="d-flex justify-content-between align-items-center">
      <span>{type}</span>
      <Button

        icon="pi pi-history"
        className="p-button-text"
        onClick={(e) => {
          e.stopPropagation();
          handleHistoryClick();
          setHistoryForType(type);
          setHistoryVisible(true);
        }}
        tooltip="History" tooltipOptions={{ position: 'bottom' }}
      />
    </div>
  );

  const desiredOrder = ['Requisition Approval'];

  const printArrayData = (data) => {
    const tableHeaders = `
      <tr>
        <th>Claim#</th>
        <th>Date</th>
        <th>Name</th>
        <th>Department</th>
        <th>Amount</th>
        <th>Currency</th>
        <th>GM</th>
        <th>Director</th>
        <th>Remarks</th>
      </tr>`;

    const tableRows = data
      .map((item) => {
        const gm =
          item.approvedone === 1
            ? "Approved"
            : item.discussedone === 1
              ? "Discussed"
              : "Pending";
        const director =
          item.approvedtwo === 1
            ? "Approved"
            : item.discussedtwo === 1
              ? "Discussed"
              : "Pending";

        return `
          <tr>
            <td>${item.claimno}</td>
            <td>${item.date}</td>
            <td>${item.name}</td>
            <td>${item.dept}</td>
            <td style="text-align:right">${item.amount?.toLocaleString('en-US', {
          style: 'decimal',
          minimumFractionDigits: 2
        })}</td>
            <td>${item.curr}</td>
            <td>${gm}</td>
            <td>${director}</td>
            <td>${item.comment || ""}</td>
          </tr>`;
      })
      .join("");

    const htmlContent = `
      <html>
        <head>
          <title>Print Claims</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; }
            th { background-color: #f4f4f4; }
          </style>
        </head>
        <body>
          <h2>Claim Approval Report</h2>
          <table>${tableHeaders}${tableRows}</table>
        </body>
      </html>`;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleShowDetails = async (row) => {
    debugger;
    const res = await ClaimAndPaymentGetById(row.id, 1, 1);
    if (res.status) {

      setSelectedDetail(res.data);
      setDetailVisible(true);

      setPreviewUrl(res.data.header.AttachmentPath == undefined || res.data.header.AttachmentPath == null ? "" : res.data.header.AttachmentPath);
      setFileName(res.data.header.AttachmentName == undefined || res.data.header.AttachmentName == null ? "" : res.data.header.AttachmentName);

    }
    else {
      Swal.fire("Error", "Data is not available", "error");

    }
  };
  const grouped = claims.reduce((acc, item) => {
    (acc[item.type] = acc[item.type] || []).push(item);
    return acc;
  }, {});


  const handleDownloadFile = async () => {
    const fileId = 0;
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
  const cleardata = async () => {
    setAction1({});
    setAction2({});
    setPPPAction1({});
    setPPPAction2({});
    setPPPAction3({});
    setPPPPVAction1({});
    setPPPPVAction2({});
  }
  const getSeverity = (Status) => {
    switch (Status) {
      case 'Approved':
        return 'btn-success';
      case 'Discussed':
        return 'btn-warning';
      case 'Posted':
        return 'success';
      case 'Saved':
        return 'danger';
      case 'new':
        return 'info';
      case 'NoAction':
        return 'btn-secondary';
      case 'renewal':
        return null;
    }
  };
  const handleRemove = async (rowsToRemove) => {
    const ids = rowsToRemove.map(r => ({ "Id": r.id }));
    console.log("Removed Items : ", ids);
    try {
      const res = await ClaimReject({ Rej: { Reject: ids, UserId: UserData?.u_id, IsPPP: 1 } }); // replace with your API/service
      if (res.status) {
        Swal.fire("Removed!", "Selected items were removed.", "success");
        load(); // reload data
        setSelectedPPPRows([]);
        cleardata();
      } else {
        Swal.fire("Error", res.message || "Failed to remove.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to remove.", "error");
    }
  };

  const confirmRemove = (rows) => {
    Swal.fire({
      title: "Are you sure?",
      text: `You are about to remove ${rows.length} item(s).`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, remove",
    }).then((result) => {
      if (result.isConfirmed) {
        handleRemove(rows);
      }
    });
  };
  const updateselectedrows = async (object) => {
    debugger;

    setSelectedPPPRows(object);

  }


  const pvgroupedBySummary = claims.reduce((acc, item) => {

    const key = item.SummaryId;
    if (!acc[key]) acc[key] = { PPP_PV_Commissioner_approveone: item.PPP_PV_Commissioner_approveone, PPP_PV_Director_approve: item.PPP_PV_Director_approve, type: item.type, PaymentNo: item.PaymentNo, PaymentPlanDate: item.PaymentPlanDate, cashInHand: item.cashInHand, cashFromSalesAtFactory: item.cashFromSalesAtFactory, rows: [] };
    acc[key].rows.push(item);
    return acc;
  }, {});

  const groupedBySummary = claims.reduce((acc, item) => {

    const key = item.SummaryId;
    if (!acc[key]) acc[key] = { type: item.type, PaymentNo: item.PaymentNo, PaymentPlanDate: item.PaymentPlanDate, cashInHand: item.cashInHand, cashFromSalesAtFactory: item.cashFromSalesAtFactory, rows: [] };
    acc[key].rows.push(item);
    return acc;
  }, {});

  const handleHistoryClick = async () => {
    const today = new Date();
    const defaultTo = today;
    const defaultFrom = new Date();
    defaultFrom.setMonth(defaultFrom.getMonth() - 1);

    const fromDate = formatDate(historyRange?.from || defaultFrom);
    const toDate = formatDate(historyRange?.to || defaultTo);

    const res = await GetPurchaseRequisitionHistory(
      0,
      UserData?.u_id,
      1,
      1,
      fromDate,
      toDate
    );

    if (res?.data) {
      sethistoryArray(res.data);
      setHistoryVisible(true);
    }
  };

  const [gmReply, setGmReply] = useState("");

  const handleGMSendReply = async () => {
    if (!gmReply.trim()) {
      Swal.fire("Error", "Reply cannot be empty", "error");
      return;
    }

    try {
      const pr_id = selectedClaimId;
      const reply = gmReply;
      const name = UserData?.name || "GM";
      const sender = "GM";

      const res = await SavePRReply(pr_id, reply, name, sender);

      if (res.success || res.status) {
        Swal.fire("Success", "Reply sent", "success");

        // 1. Fetch updated history immediately to get the FULL cumulative comment
        const updatedRemarks = await GetPurchaseRequisitionRemarks(pr_id);

        let newFullComment = reply; // Fallback
        if (Array.isArray(updatedRemarks) && updatedRemarks.length > 0) {
          // Sort to get latest
          const sorted = [...updatedRemarks].sort((a, b) => new Date(a.logdate) - new Date(b.logdate));
          setRemarksData(sorted);
          newFullComment = sorted[sorted.length - 1].pr_comment;
        }

        // 2. Remove the PR from the list because adding a comment returns it to the applicant (Saved status)
        setclaims(prev => prev.filter(item => item.id !== pr_id));

        // 3. Clean up action states
        setAction1(prev => { const n = { ...prev }; delete n[pr_id]; return n; });
        setAction2(prev => { const n = { ...prev }; delete n[pr_id]; return n; });

        setGmReply("");
        
        // 4. Close the modal since the PR is no longer actionable by the GM
        toggleRemarkModal();
      } else {
        Swal.fire("Error", res.message || "Failed to send reply", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to send reply", "error");
    }
  };

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>


          <Breadcrumbs title="Procurement" breadcrumbItem="Approval" />

          {/* 🔍 Search Filter */}
          <Card className="p-3 mb-3">
            <Row className="align-items-center g-2">

              <Col lg="5" md="5">

              </Col>
              <Col lg="7" md="7">

                <div className="text-end button-items">
                  <label style={{ color: "red" }}>Please click Save button to approve the selected rows</label>
                  <button type="button" className="btn btn-primary" onClick={handleSave}>

                    <i className="bx bx-check-circle label-icon font-size-16 align-middle me-2"></i> Save
                  </button>
                  <button type="button" className="btn btn-danger" onClick={cleardata}>
                    <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i> Cancel
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={exportToExcel}>
                    <i className="bx bx-export label-icon font-size-16 align-middle me-2" ></i> Export
                  </button>

                  {/* <button className="btn btn-primary" >
                    <i className="bx bx-printer label-icon font-size-16 align-middle me-2"></i> Print
                  </button> */}

                </div>
              </Col>
            </Row>
          </Card>

          <Row>
            <Col lg="12">
              <Card>
                <Accordion multiple>
                  {desiredOrder.map(type => (
                    <AccordionTab key={type} header={headerTemplate(type)}>
                      <ApprovalTable
                        type={type}
                        data={claims}
                        handleDiscuss={handleDiscuss}
                        handleDiscussPPP={handleDiscussPPP}
                        handleClickgmapprovan={handleClickgmapprovan}
                        load={load}
                        handleClick1={handleClick1}
                        handleClick2={handleClick2}
                        handlePPPClick1={handlePPPClick1}
                        handlePPPClick2={handlePPPClick2}
                        handlePPPClick3={handlePPPClick3}
                        handlePPPPVClick3={handlePPPPVClick3}
                        handlePPPPVDirector={handlePPPPVDirector}
                        action1={action1}
                        action2={action2}
                        pppAction1={pppAction1}
                        pppAction2={pppAction2}
                        pppAction3={pppAction3}
                        PPPPVAction1={PPPPVAction1}
                        PPPPVAction2={PPPPVAction2}
                        // handleShowDetails={handleShowDetails}
                        roledetails={roledetails}
                        handleVoucherClick={handleVoucherClick}
                        groupedBySummary={groupedBySummary}
                        handlePVSave={handlePVSave}
                        pvgroupedBySummary={pvgroupedBySummary}
                        handleViewRemarks={handleViewRemarks}
                        handleDirectorDiscuss={handleDirectorDiscuss} // Pass new handler
                      />
                    </AccordionTab>
                  ))}
                </Accordion>
              </Card>
            </Col>
          </Row>

        </Container>
      </div>
      <Dialog
        visible={showGmModal}
        onHide={() => setGmShowModal(false)}
        style={{ width: '50vw', maxWidth: '600px' }}
        breakpoints={{ '960px': '75vw', '640px': '100vw' }}
        contentStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        <Input
          type="textarea"
          className="custom-textarea"
          value={selectedClaim?.comment || ''}
          onChange={(e) =>
            setSelectedClaim({ ...selectedClaim, comment: e.target.value })
          }
          placeholder="Enter your comment"
        />
        <div className="mt-3 text-end">
          <Button label="Close" icon="pi pi-check" onClick={handleSaveCommentGm} />
        </div>
      </Dialog>
      <Dialog
        header="Remarks"
        visible={showModal}
        onHide={() => setShowModal(false)}
        style={{ width: '50vw', maxWidth: '600px' }}
        breakpoints={{ '960px': '75vw', '640px': '100vw' }}
        contentStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        {selectedClaim?.Claim_Discussed_Count == 2 && (
          <span style={{ color: "red" }}>Cancel The Transaction</span>
        )}
        <Input
          type="textarea"
          className="custom-textarea"
          value={selectedClaim?.comment || ''}
          onChange={(e) =>
            setSelectedClaim({ ...selectedClaim, comment: e.target.value })
          }
          placeholder="Enter your comment"
        />
        <div className="mt-3 text-end">
          <Button label="Close" icon="pi pi-check" onClick={handleSaveComment} />
        </div>
      </Dialog>

      {/* Director Discussion Modal */}
      <Dialog
        header="Director Discussion Points"
        visible={directorDiscussModal}
        onHide={() => setDirectorDiscussModal(false)}
        style={{ width: '50vw', maxWidth: '600px' }}
        breakpoints={{ '960px': '75vw', '640px': '100vw' }}
        contentStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        <div className="mb-3">
          <Label className="fw-bold">History:</Label>
          <div className="p-2 border rounded bg-light" style={{ maxHeight: "400px", overflowY: "auto" }}>
            {(() => {
              const parsedMsgs = parseDirectorComments(directorComments);
              if (parsedMsgs.length === 0) return <div className="text-muted p-2">No discussion yet.</div>;

              const myRole = roledetails?.[0]?.ApproverTwo === 1 ? "Director" : "GM";

              return parsedMsgs.map((msg, idx) => {
                const isMe = msg.sender === myRole;
                const isDirector = msg.sender === "Director";

                // Alignment: Me -> Right, Other -> Left
                // Color: Director -> Blueish, GM -> Greenish? Or just Me -> Blue, Other -> Gray

                const alignSelf = isMe ? "flex-end" : "flex-start";
                const bgColor = isMe ? "#dcf8c6" : "#ffffff"; // WhatsApp style (Green for me)
                // Or specific: Director (Blue), GM (Green)
                // Let's stick to "Me vs Them" for standard chat feel, or Role based is requested?
                // Request: "Director's msg and Gm's reply in different boxes".

                // Let use Role-based colors to be clear.
                const roleColor = isDirector ? "#e3f2fd" : "#f1f8e9"; // Blue vs Green light

                return (
                  <div key={idx} className="d-flex flex-column mb-2" style={{ alignItems: alignSelf }}>
                    <div style={{
                      backgroundColor: roleColor,
                      borderRadius: "10px",
                      padding: "8px 12px",
                      maxWidth: "80%",
                      boxShadow: "0 1px 1px rgba(0,0,0,0.1)"
                    }}>
                      <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: "0.75rem", color: "#555" }}>
                        <strong className="me-2">{msg.sender}</strong>
                        <span>{msg.time}</span>
                      </div>
                      <div style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <Label className="fw-bold">Reply:</Label>
        <Input
          type="textarea"
          className="custom-textarea"
          value={directorReply}
          onChange={(e) => setDirectorReply(e.target.value)}
          placeholder="Type your discussion point..."
          rows={3}
        />
        <div className="mt-3 text-end">
          <Button label="Send Reply" icon="pi pi-send" className="p-button-primary" onClick={handleDirectorSend} />
          <Button label="Cancel" icon="pi pi-times" className="p-button-secondary ms-2" onClick={() => setDirectorDiscussModal(false)} />
        </div>
      </Dialog>



      <Dialog
        header="Remarks"
        visible={showModalPPP}
        onHide={() => setShowModalPPP(false)}
        style={{ width: '50vw', maxWidth: '600px' }}
        breakpoints={{ '960px': '75vw', '640px': '100vw' }}
        contentStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        {selectedClaim?.PPP_Discussed_Count == 2 && (
          <span style={{ color: "red" }}>Cancel The Transaction</span>
        )}
        <Input
          type="textarea"
          className="custom-textarea"
          value={selectedClaim?.comment || ''}
          onChange={(e) =>
            setSelectedClaim({ ...selectedClaim, comment: e.target.value })
          }
          placeholder="Enter your comment"
        />
        <div className="mt-3 text-end">
          <Button label="Save" icon="pi pi-check" onClick={handleSaveCommentPPP} />
        </div>
      </Dialog>
      {/* <Modal isOpen={showvoucherModal} toggle={togglevoucherModal} size="xl">
        <ModalHeader toggle={togglevoucherModal}>Voucher</ModalHeader>
        <ModalBody>

          {selectedVoucherId && (
            <PaymentVoucher VoucherId={selectedVoucherId} />
          )}
        </ModalBody>
      </Modal> */}

      <Modal isOpen={historyVisible} toggle={() => setHistoryVisible(false)} className="modal-fullscreen">
        <ModalHeader toggle={() => setHistoryVisible(false)}>
          {historyForType} History
        </ModalHeader>
        <ModalBody>
          <Row form className="align-items-end mb-3">
            <Col sm="4">
              <label>From</label>


              <InputGroup>
                <Flatpickr
                  name="FromDate"
                  id="FromDate"
                  className="form-control d-block"
                  placeholder="dd-mm-yyyy"
                  options={{
                    altInput: true,
                    altFormat: "d-M-Y",
                    dateFormat: "Y-m-d",
                  }}
                  value={historyRange.from}
                  onChange={([date]) =>
                    setHistoryRange((r) => ({ ...r, from: date }))
                  }

                  style={{ cursor: "default" }}
                />

              </InputGroup>
            </Col>
            <Col sm="4">
              <label>To</label>
              <InputGroup>
                <Flatpickr
                  name="FromDate"
                  id="FromDate"
                  className="form-control d-block"
                  placeholder="dd-mm-yyyy"
                  options={{
                    altInput: true,
                    altFormat: "d-M-Y",
                    dateFormat: "Y-m-d",
                  }}
                  value={historyRange.to}
                  onChange={([date]) =>
                    setHistoryRange((r) => ({ ...r, to: date }))
                  }
                  style={{ cursor: "default" }}
                />

              </InputGroup>
            </Col>
            <Col sm="4">



              <button type="button" className="btn btn-info" onClick={() => {
                const filtered = historyArray.filter(h =>
                  h.type === historyForType &&
                  (!historyRange.from || new Date(h.transactiondate) >= historyRange.from) &&
                  (!historyRange.to || new Date(h.transactiondate) <= historyRange.to)
                );
                handleHistoryClick();
              }}>
                <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i> Search</button>

            </Col>
          </Row>

          <DataTable value={historyArray} dataKey="id" responsiveLayout="scroll" rows={20}>
            {/* New PR info columns */}
            <Column field="pr_number" header="PR #" />
            <Column field="prdate" header="PR Date" />
            <Column field="createdbyname" header="Created By" />

            <Column field="prtype" header="PR Type" />
            <Column field="SupplierName" header="Supplier" />
            <Column
              field="NetAmount"
              header="Total Amount"
              body={(rowData) =>
                rowData.NetAmount?.toLocaleString('en-US', {
                  style: 'decimal',
                  minimumFractionDigits: 2
                })
              }
              style={{ textAlign: 'right' }}
            />

            {/* Existing columns */}
            <Column
              headerStyle={{ textAlign: 'center' }}
              field="transactiondate"
              header="Approved Date"
            />
            <Column
              header="GM"
              style={{ textAlign: 'center' }}
              headerStyle={{ textAlign: 'center' }}
              body={(r) => (
                <ApproverIndicator
                  approved={r.approvedone}
                  discussed={r.discussedone}
                />
              )}
            />
            <Column
              header="Director"
              style={{ textAlign: 'center' }}
              headerStyle={{ textAlign: 'center' }}
              body={(r) => (
                <ApproverIndicator
                  approved={r.approvedtwo}
                  discussed={r.discussedtwo}
                />
              )}
            />
            <Column header="Remarks" body={(rowData) => rowData.comment} />
          </DataTable>
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-danger" onClick={() => setHistoryVisible(false)} ><i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>Close</button>

        </ModalFooter>
      </Modal>


      <Modal isOpen={remarkModalOpen} toggle={toggleRemarkModal} size="lg">
        <ModalHeader toggle={toggleRemarkModal}>Discussion Point (DP)</ModalHeader>
        <ModalBody>
          {/* Chat UI for Discussion History */}
          <Label className="fw-bold mb-2">Discussion History</Label>
          <div
            className="chat-history mb-3 p-3"
            style={{
              maxHeight: "300px",
              overflowY: "auto",
              backgroundColor: "#f7f7f7",
              borderRadius: "8px",
              border: "1px solid #ddd"
            }}
          >
            {remarksData && remarksData.length > 0 ? (
              // Ensure sorted by date (oldest first) so diff works
              [...remarksData]
                .sort((a, b) => new Date(a.logdate) - new Date(b.logdate))
                .map((msg, index, sortedArr) => {
                  let cleanMessage = msg.pr_comment || "";

                  // If original message is effectively empty/null, skip immediately
                  if (!cleanMessage.trim()) return null;

                  // 🔹 Valid Chain Check - Removed per user request
                  // const currentHeader = selectedClaim?.comment || "";
                  // if (currentHeader && !currentHeader.startsWith(msg.pr_comment)) {
                  //    return null;
                  // }

                  // Diff Logic: Remove previous message content to show only new text
                  if (index > 0) {
                    const prevComment = sortedArr[index - 1].pr_comment || "";
                    if (prevComment && cleanMessage.startsWith(prevComment)) {
                      cleanMessage = cleanMessage.substring(prevComment.length).trim();
                    }
                  }

                  let sender = msg.username;

                  // Check if the message starts with [User at Date]: pattern
                  // Regex breakdown: ^\[ matches start bracket, (.*?) matches username (group 1), \s+at\s+ matches " at ", .*? matches date, \]: matches end bracket and colon
                  const match = cleanMessage.match(/^\[(.*?)\s+at\s+.*?\]:\s*/);
                  if (match) {
                    sender = match[1]; // Extract username from the bracket
                    cleanMessage = cleanMessage.replace(match[0], ""); // Remove the prefix
                  }

                  const isGM = sender === "GM" || sender === (UserData?.name || "GM");

                  // If message is empty after diff, skip
                  if (!cleanMessage || !cleanMessage.trim()) return null;

                  return (
                    <div
                      key={index}
                      className="d-flex flex-column mb-2"
                      style={{
                        alignItems: isGM ? "flex-end" : "flex-start"
                      }}
                    >
                      <div
                        className="p-2 px-3"
                        style={{
                          backgroundColor: isGM ? "#e3f2fd" : "#ffffff",
                          color: "#333",
                          borderRadius: "12px",
                          borderBottomRightRadius: isGM ? "0" : "12px",
                          borderBottomLeftRadius: isGM ? "12px" : "0",
                          maxWidth: "80%",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-baseline gap-2 mb-1">
                          <strong style={{ fontSize: "0.85rem", color: isGM ? "#1565c0" : "#424242" }}>
                            {sender}
                          </strong>
                          <small style={{ fontSize: "0.7rem", color: "#757575" }}>
                            {msg.logdate}
                          </small>
                        </div>
                        <div style={{ wordBreak: "break-word", fontSize: "0.9rem" }}>
                          {cleanMessage}
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-center text-muted fst-italic p-3">
                No discussion history found.
              </div>
            )}
          </div>

          <hr />

          {/* GM Reply */}
          <Label className="fw-bold mt-2">Your Reply</Label>
          <Input
            type="textarea"
            rows="3"
            placeholder="Type your message here..."
            value={gmReply}
            onChange={(e) => setGmReply(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={handleGMSendReply}>
            <i className="bx bx-send me-1"></i> Send Reply
          </Button>
          <Button color="secondary" onClick={toggleRemarkModal}>Close</Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={detailVisible} toggle={() => setDetailVisible(false)} size="xl">
        <ModalHeader toggle={() => setDetailVisible(false)}>Purchase Requisition Details</ModalHeader>
        <ModalBody>
          {/* {selectedDetail!=undefined && selectedDetail !=null && selectedDetail.header !=undefined && selectedDetail.header !=null && ( */}
          {1 == 1 && (
            <>
              <Row form>
                {[
                  ["Category Type ", selectedDetail.header?.claimcategory],
                  ["Application Date", selectedDetail.header?.ApplicationDatevw],
                  ["Application No", selectedDetail.header?.ApplicationNo],
                  ["Department ", selectedDetail.header?.departmentname],
                  ["Applicant ", selectedDetail.header?.applicantname],
                  ["Job Title", selectedDetail.header?.JobTitle],
                  ["HOD", selectedDetail.header?.HOD_Name],
                  ["Trans Currency ", selectedDetail.header?.transactioncurrency],
                  ["Attachment ", selectedDetail.header?.AttachmentName ? (
                    <button
                      type="button"
                      className="btn d-flex align-items-center justify-content-between"
                      onClick={handleDownloadFile}
                      key="attachment"
                      style={{
                        height: "10px",
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
                  ) : (
                    "No Attachment"
                  )
                  ],


                  ["Cost Center", selectedDetail.header?.CostCenter],
                  ["Claim Amt in TC", <span key="amtintc"> {selectedDetail.header?.ClaimAmountInTC?.toLocaleString('en-US', {
                    style: 'decimal',
                    minimumFractionDigits: 2
                  })}</span>]
                ].map(([label, val], i) => (
                  <Col md="4" key={i} className="form-group row ">
                    <Label className="col-sm-4 col-form-label bold">{label}</Label>
                    <Col sm="8" className="mt-2">: {val}</Col>
                  </Col>
                ))}
              </Row>
              <hr />
              <DataTable value={selectedDetail.details}>
                <Column headerStyle={{ textAlign: 'center' }} header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                <Column headerStyle={{ textAlign: 'center' }} field="claimtype" header="Claim Type" />
                <Column headerStyle={{ textAlign: 'center' }} field="PaymentDescription" header="Claim & Payment Description" />
                <Column style={{ textAlign: "right" }} field="TotalAmount" header="Amount"
                  body={(rowData) =>
                    rowData.TotalAmount?.toLocaleString('en-US', {
                      style: 'decimal',
                      minimumFractionDigits: 2
                    })
                  } />
                <Column headerStyle={{ textAlign: 'center' }} field="ExpenseDatevw" header="Expense Date" />
                <Column headerStyle={{ textAlign: 'center' }} field="Purpose" header="Purpose" />
              </DataTable>

              <Row className="mt-3">
                <Col>
                  <Label>Remarks</Label>
                  <Input type="textarea" rows="2" disabled value={selectedDetail.header?.Remarks} />
                </Col>
              </Row>







              <Row className="mt-3">
                <Col>


                  <Table className="table mt-3" style={{ width: "76%" }}>
                    <thead style={{ backgroundColor: "#3e90e2" }}>
                      {/* <table className="table table-bordered text-center">
                                    <thead> */}
                      <tr>
                        <th style={{ padding: "0px", width: "18%", backgroundColor: "#B4DBE0" }} className="text-center" colSpan="2">Claim</th>
                        <th style={{ padding: "0px", width: "18%", backgroundColor: "#E6E4BC" }} className="text-center" colSpan="3">PPP</th>
                        <th style={{ padding: "0px", width: "10%", backgroundColor: "#FFE9F5" }} className="text-center" colSpan="2">Vouchers</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th style={{ padding: "0px", backgroundColor: "#B4DBE0" }} className="text-center">GM</th>
                        <th style={{ padding: "0px", backgroundColor: "#B4DBE0" }} className="text-center">Director</th>
                        <th style={{ padding: "0px", backgroundColor: "#E6E4BC" }} className="text-center">GM</th>
                        <th style={{ padding: "0px", backgroundColor: "#E6E4BC" }} className="text-center">Director</th>
                        <th style={{ padding: "0px", backgroundColor: "#E6E4BC" }} className="text-center">CEO</th>
                        <th style={{ padding: "0px", backgroundColor: "#FFE9F5" }} className="text-center">Director</th>
                        <th style={{ padding: "0px", backgroundColor: "#FFE9F5" }} className="text-center">Commissioner</th>

                      </tr>
                      <tr>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.ClmgmStatus)}`} /></td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.ClmDrStatus)}`} /></td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.PPPgmStatus)}`} /></td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.PPPDrStatus)}`} /></td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.PPPCEOStatus)}`} /></td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.VouCmrStatus)}`} /> </td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.VouDrStatus)}`} /> </td>
                      </tr>
                    </tbody>
                  </Table>

                  <br />
                </Col>
              </Row>

              <Row className="mt-3">
                <Col>

                  <div className="col-12 col-lg-6 text-left" >
                    <span className="me-3">
                      <Button

                        className={`btn-circle p-button-rounded btn btn-success`}

                      /> Approved</span>
                    <span className="me-3"><Button

                      className={`btn-circle p-button-rounded  btn btn-warning`}
                    /> Discussed</span>

                    <span className="me-3"><Button className={`btn-circle p-button-rounded  btn btn-secondary`} /> Yet to Act </span>
                  </div>
                  <div className="col-12 col-lg-6 text-end"></div>
                </Col>
              </Row>
            </>
          )}
        </ModalBody>
        <ModalFooter>


          <button type="button" className="btn btn-danger" onClick={() => setDetailVisible(false)}> <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Close</button>

        </ModalFooter>
      </Modal>

    </React.Fragment>
  );




};



const ApprovalTable = ({
  type,
  data,
  handleDiscuss,
  handleDiscussPPP,
  load,
  handleClick1,
  handleClick2,
  action1,
  action2,
  // handleShowDetails,
  roledetails,
  pppAction1,
  pppAction2,
  pppAction3,
  PPPPVAction1,
  PPPPVAction2,
  handlePPPClick1,
  handlePPPClick2, handlePPPClick3, handleVoucherClick, handlePPPPVClick3, handlePPPPVDirector, handleClickgmapprovan
  , selectedPPPRows, confirmRemove, handleRemove, updateselectedrows, PaymentSummaryTable, groupedBySummary, handlePVSave, pvgroupedBySummary, handleViewRemarks,
  handleDirectorDiscuss // Receive prop
}) => {

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },

    pr_number: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    prdate: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    createdbyname: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    prtype: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    SupplierName: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }]
    },
    CurrencyCode: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }]
    },
    NetAmount: {
      operator: FilterOperator.OR,
      constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }]
    },
  });

  // 🔹 Global filter input
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState({});
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileName, setFileName] = useState("");

  // 🔹 History Remarks Modal State
  const [historyRemarksVisible, setHistoryRemarksVisible] = useState(false);
  const [selectedHistoryRemark, setSelectedHistoryRemark] = useState("");

  const handleShowHistoryRemarks = (rowData) => {
    setSelectedHistoryRemark(rowData.comment || "No remarks");
    setHistoryRemarksVisible(true);
  };

  // 🔹 Reset filters
  const initFilters = () => {
    setFilters({
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      pr_number: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      prdate: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      createdbyname: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      prtype: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      SupplierName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      CurrencyCode: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      NetAmount: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
    });
    setGlobalFilterValue("");
  };

  // 🔹 Global filter change
  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters((prev) => ({
      ...prev,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    }));
  };

  const clearFilter = () => {
    initFilters();
  };

  const ApproverOne = roledetails?.[0]?.ApproverOne === 1;
  const ApproverTwo = roledetails?.[0]?.ApproverTwo === 1;
  const ApproverThree = roledetails?.[0]?.ApproverThree === 1;
  const ApproverFour = roledetails?.[0]?.ApproverFour === 1;
  const ApproverFive = roledetails?.[0]?.ApproverFive === 1;
  const ApproverSix = roledetails?.[0]?.ApproverSix === 1;
  const ApproverSeven = roledetails?.[0]?.ApproverSeven === 1;

  const deptOptions = [...new Set(data.map(d => d.dept))].map(d => ({ label: d, value: d }));

  const detailTemplate = (rowData) => (
    <div className="p-3">
      <strong>Transactions:</strong> {rowData.transactions}
    </div>
  );

  const renderHeader = () => {
    return (
      <div className="row align-items-center g-3 clear-spa">
        <div className="col-12 col-lg-6">
          <Button className="btn btn-danger btn-label" onClick={clearFilter} >
            <i className="mdi mdi-filter-off label-icon" /> Clear
          </Button>
        </div>
        <div className="col-12 col-lg-3 text-end">
          <span className="me-4">
            <Button
              icon="pi pi-check"
              className={`btn-circle p-button-rounded p-button-success`}

            /> Approved</span>
          <span className="me-4"><Button
            icon="pi pi-comment"
            className={`btn-circle p-button-rounded  p-button-warning`}
          /> Discussed</span>
          {/* <span className="me-1"><Tag value="P" severity={getSeverity("Posted")} /> Posted</span> */}
        </div>
        <div className="col-12 col-lg-3">
          <input className="form-control" type="text" placeholder="Keyword Search" value={globalFilterValue} onChange={onGlobalFilterChange} />
        </div>
      </div>
    );
  };
  const actionAckBodyTemplate = (rowData) => {
    return (
      <span style={{ cursor: "pointer", color: "blue" }} className="btn-rounded btn btn-link"
        onClick={() => handleVoucherClick(rowData.voucherid)}>{rowData.voucherno}</span>
    );
  };

  const renderPPPHeader = () => {
    return (
      <div className="row align-items-center g-3 clear-spa">
        <div className="col-12 col-lg-6">
          <Button
            icon="pi pi-trash"
            label="Move Back"
            className="p-button-danger"
            onClick={() => confirmRemove(selectedPPPRows)}
            disabled={selectedPPPRows?.length === 0}
          /> </div></div>)
  }
  const PPPHeader = renderPPPHeader();


  const header = renderHeader();

  const handleShowDetails = async (row) => {
    const res = await GetByIdPurchaseRequisition(row.id, 1, 1);

    if (res.status) {
      let details = res.data.Details || [];

      // Add MemoDisplay column from PM_Number directly
      details = details.map((d) => ({
        ...d,
        memo_number: d.PM_Number || "NA",
        MemoDisplay: d.PM_Number || "NA",
      }));

      // Collect unique memo numbers for header
      let headerMemoNumbers = [
        ...new Set(details.map((d) => d.PM_Number).filter(Boolean))
      ].join(", ");

      if (!headerMemoNumbers) headerMemoNumbers = "NA";

      setSelectedDetail({
        ...res.data,
        Header: {
          ...res.data.Header,
          MemoConcat: headerMemoNumbers,
        },
        Details: details,
      });

      setDetailVisible(true);

      setPreviewUrl(res.data.Header.filepath || "");
      setFileName(res.data.Header.filepath || "");
    } else {
      Swal.fire("Error", "Data is not available", "error");
    }
  };

  const actionclaimBodyTemplate = (rowData) => {
    return <span style={{ cursor: "pointer", color: "blue" }} className="btn-rounded btn btn-link"
      onClick={() => handleShowDetails(rowData)}>{rowData.pr_number}</span>;
  };

  const handleDownloadFile = async (data) => {
    const fileId = data.prid ? data.prid : 0;

    const filepath = data.filepath ? data.filepath : "";
    const filename = data.filename ? data.filename : "";

    // concat path + filename
    const fullPath = filepath && filename ? `${filepath}/${filename}` : "";

    if (!fullPath) {
      Swal.fire("Error", "File path or name missing", "error");
      return;
    }

    const fileUrl = await DownloadPurchaseRequisitionFileById(fileId, fullPath);

  };

  const actionMemoBodyTemplate = (rowData) => {
    return <span style={{ cursor: "pointer", color: "blue" }} className="btn-rounded btn btn-link"
      onClick={() => handleDownloadFile(rowData)}>{rowData.filename}</span>;
  };

  return (

    <>
      <DataTable value={data} paginator rows={20} header={header}
        filters={filters} globalFilterFields={['pr_number', 'createdbyname', 'prdate', 'prtype', 'SupplierName', 'CurrencyCode', 'NetAmount']}
        dataKey="id" expandedRows={null} rowExpansionTemplate={detailTemplate}
        onRowToggle={(e) => { }} responsiveLayout="scroll"
        rowClassName={(rowData) =>
          rowData.discussedone === 1 || rowData.discussedtwo === 1 ? "Discussed-row" : ""
        }
      >
        <Column
          header="S.No" style={{ textAlign: 'center' }}
          body={(rowData, { rowIndex }) => rowIndex + 1}
        />
        <Column field="pr_number" header="PR #" filter body={actionclaimBodyTemplate} />
        <Column field="prdate" header="PR Date" filter />
        <Column field="createdbyname" header="Created By" filter />

        <Column field="prtype" header="PR Type" filter />
        <Column field="SupplierName" header="Supplier" filter />
        <Column field="CurrencyCode" header="Currency" filter />
        <Column
          field="NetAmount"
          filter
          header="Total Amount"
          body={(rowData) =>
            rowData.NetAmount?.toLocaleString('en-US', {
              style: 'decimal',
              minimumFractionDigits: 2
            })
          }
          style={{ textAlign: 'right' }}
        />
        <Column header="History" body={(rowData) => (
          <span onClick={() => handleShowHistoryRemarks(rowData)} title="View Remarks" style={{ cursor: 'pointer' }}>
            <i className="mdi mdi-comment-text-outline" style={{ fontSize: '1.5rem', color: '#17a2b8' }}></i>
          </span>

        )} />
        <Column
          style={{ textAlign: 'center' }}
          header="GM"
          body={(rowData) => {
            const gmApproved = action1[rowData.id] === 'approve';
            const directorDiscussed = action2[rowData.id] === 'discuss';
            const gmDisabled = !ApproverOne || (rowData.approvedone === 1 && !directorDiscussed);

            return (
              <div className="d-flex gap-2">
                <Button
                  icon="pi pi-check"
                  className={`btn-circle p-button-rounded ${gmApproved ? 'p-button-success' : 'p-button-outlined'}`}
                  onClick={() => handleClick1('approve', rowData.id)}

                  tooltipOptions={{ position: 'top' }}
                  disabled={gmDisabled}
                />
                <Button
                  icon="pi pi-comment"
                  className={`btn-circle p-button-rounded ${action1[rowData.id] === 'discuss' ? 'p-button-warning' : 'p-button-outlined'}`}
                  onClick={() => {
                    console.log("[GM Discussion Click] Clicked on discuss button for rowData:", rowData);
                    // handleClick1('discuss', rowData.id); // Don't set state immediately
                    // handleDiscuss(rowData); // OLD modal
                    handleViewRemarks(rowData.id, rowData); // NEW modal
                  }}
                  tooltip={rowData.comment}
                  tooltipOptions={{ position: 'top' }}
                  disabled={gmDisabled}
                />
              </div>
            );



          }}
        />

        {(ApproverOne === true || ApproverTwo == true || ApproverFour == true || ApproverFive == true) && (
          <Column
            style={{ textAlign: 'center' }}
            header="Director"
            body={(rowData) => {
              const directorDisabled =
                (!ApproverTwo) || rowData.approvedone === 0 || rowData.approvedtwo === 1;

              // GM View Logic: Show Director column with Discuss icon only
              if (ApproverOne) {
                const isDiscussed = rowData.discussedtwo === 1 || action2[rowData.id] === 'discuss';
                return (
                  <div className="d-flex gap-2 justify-content-center">
                    <Button
                      icon="pi pi-comment"
                      className={`btn-circle p-button-rounded ${isDiscussed ? 'p-button-warning' : 'p-button-outlined'}`}
                      onClick={() => {
                        console.log("[GM View Director Discussion Click] Clicked for rowData:", rowData);
                        handleDirectorDiscuss(rowData);
                      }}
                      tooltip="Director Discussion"
                      tooltipOptions={{ position: 'top' }}
                    />
                  </div>
                );
              }

              // Director View Logic
              if (rowData.approvedone === 1) {
                return (
                  <div className="d-flex gap-2">
                    <Button
                      icon="pi pi-check"
                      className={`btn-circle p-button-rounded ${action2[rowData.id] === 'approve' ? 'p-button-success' : 'p-button-outlined'
                        }`}
                      onClick={() => handleClick2('approve', rowData.id)}
                      tooltip="Approve"
                      tooltipOptions={{ position: 'top' }}
                      disabled={directorDisabled && !ApproverTwo} // Allow Director to act
                    />
                    <Button
                      icon="pi pi-comment"
                      className={`btn-circle p-button-rounded ${action2[rowData.id] === 'discuss' ? 'p-button-warning' : 'p-button-outlined'
                        }`}
                      onClick={() => {
                        console.log("[Director Discussion Click] Clicked on discuss button for rowData:", rowData);
                        // For Director, use the NEW handler for Director-GM discussion
                        handleDirectorDiscuss(rowData);
                      }}
                      tooltip="Discuss"
                      tooltipOptions={{ position: 'top' }}
                      disabled={directorDisabled && !ApproverTwo}
                    />
                  </div>
                );
              }
            }}
          />
        )}
      </DataTable>

      <Modal isOpen={detailVisible} toggle={() => setDetailVisible(false)} size="xl">
        <ModalHeader toggle={() => setDetailVisible(false)}>PR Details</ModalHeader>
        <ModalBody>
          {selectedDetail && (
            <>
              {/* Header Section */}
              <Row form>
                {[
                  ["PR No.", selectedDetail.Header?.PR_Number],
                  ["PR Type", selectedDetail.Header?.prTypeName],
                  ["PR Date", selectedDetail.Header?.PRDate],
                  ["PM No.", selectedDetail.Header?.MemoConcat],
                  ["Supplier", selectedDetail.Header?.SupplierName],
                  ["Currency", selectedDetail.Header?.currencycode],
                  ["Payment Term", selectedDetail.Header?.PaymentTermName],
                  ["Sup. Address", selectedDetail.Header?.SupplierAddress],
                  ["Delivery Term", selectedDetail.Header?.DeliveryTerm],
                  ["Requestor", selectedDetail.Header?.UserName],
                  ["BTG Delivery Address", selectedDetail.Header?.BTGDeliveryAddress],
                  ["Sup. Contact", selectedDetail.Header?.contact],
                  ["Sup. Email", selectedDetail.Header?.Email],
                ].map(([label, val], i) => (
                  <Col md="4" key={i} className="form-group row">
                    <Label className="col-sm-5 col-form-label bold">{label}</Label>
                    <Col sm="7" className="mt-2" style={{ wordWrap: "break-word" }}>
                      :{" "}
                      {(label === "Supplier") ? (
                        <b>{val}</b>
                      ) : (label === "Currency") ? (
                        <b style={{ color: "green" }}>{val}</b>
                      )
                        : (
                          val
                        )}
                    </Col>
                  </Col>
                ))}
              </Row>

              <hr />




              <DataTable value={selectedDetail.Details} footerColumnGroup={
                <ColumnGroup>
                  <Row>
                    <Column footer="GRAND TOTAL" colSpan={6} footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />


                    <Column
                      footer={<b>{selectedDetail.Header?.HeaderDiscountValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>}
                    />
                    <Column footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                    <Column footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                    <Column
                      footer={<b>{selectedDetail.Header?.HeaderTaxValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>}
                    />
                    <Column footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                    <Column
                      footer={<b>{selectedDetail.Header?.HeaderVatValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>}
                    />

                    <Column footerStyle={{ color: "#ff5a00" }}
                      footer={<b>{selectedDetail.Header?.HeaderNetValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>}
                    />
                  </Row>
                </ColumnGroup>
              }>
                <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                <Column field="memo_number" header="PM No." />
                {/* <Column field="groupname" header="Item Group" /> */}
                <Column field="ItemName" header="Item Name" />

                <Column field="Qty" header="Qty"
                  body={(rowData) =>
                    rowData.Qty?.toLocaleString('en-US', {
                      style: 'decimal',
                      minimumFractionDigits: 3
                    })
                  }
                />
                <Column field="UOMName" header="UOM" />
                <Column field="UnitPrice" header="Unit Price"
                  body={(rowData) =>
                    rowData.UnitPrice?.toLocaleString('en-US', {
                      style: 'decimal',
                      minimumFractionDigits: 2
                    })
                  }
                />
                <Column field="DiscountValue" header="Discount"
                  body={(rowData) =>
                    rowData.DiscountValue?.toLocaleString('en-US', {
                      style: 'decimal',
                      minimumFractionDigits: 2
                    })
                  }
                  footer={selectedDetail.Header?.HeaderDiscountValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                />
                <Column field="taxname" header="Tax" />
                <Column field="TaxPerc" header="Tax %" />
                <Column field="TaxValue" header="Tax Amount"
                  body={(rowData) =>
                    rowData.TaxValue?.toLocaleString('en-US', {
                      style: 'decimal',
                      minimumFractionDigits: 2
                    })
                  }
                  footer={selectedDetail.Header?.HeaderTaxValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                />
                <Column field="vatPerc" header="VAT %" />
                <Column field="vatValue" header="VAT Amount"
                  body={(rowData) =>
                    rowData.vatValue?.toLocaleString('en-US', {
                      style: 'decimal',
                      minimumFractionDigits: 2
                    })
                  }
                  footer={selectedDetail.Header?.HeaderVatValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                />
                <Column field="NetTotal" header="Total Amount" bodyStyle={{ color: "#ff5a00" }}
                  body={(rowData) =>
                    rowData.NetTotal?.toLocaleString('en-US', {
                      style: 'decimal',
                      minimumFractionDigits: 2
                    })
                  }
                  footer={<b>{selectedDetail.Header?.HeaderNetValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>}
                />
              </DataTable>

              <Row className="mt-3">
                <Col>
                  <Label>PM Remarks</Label>
                  <Card className="p-2 bg-light border">
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {selectedDetail.Header?.Memoremarks || "No pm remarks"}
                    </div>
                  </Card>
                </Col>
              </Row>

              <Row className="mt-3">
                <Col>
                  <Label>Remarks</Label>
                  <Card className="p-2 bg-light border">
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {selectedDetail.Header?.Remarks || "No remarks"}
                    </div>
                  </Card>
                </Col>
              </Row>

              <Row className="mt-3">
                <DataTable tableStyle={{ width: "60%" }} value={selectedDetail.Attachment}>
                  <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                  <Column field="AttachmentName" body={actionMemoBodyTemplate} header="Attachment" />
                </DataTable>
              </Row>

            </>
          )}
        </ModalBody>

        <ModalFooter>
          <button type="button" className="btn btn-danger" onClick={() => setDetailVisible(false)}>
            <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Close
          </button>
        </ModalFooter>
      </Modal>

      {/* History Remarks Dialog */}
      <Dialog
        header="Remarks"
        visible={historyRemarksVisible}
        onHide={() => setHistoryRemarksVisible(false)}
        style={{ width: '30vw', maxWidth: '400px' }}
        breakpoints={{ '960px': '75vw', '640px': '100vw' }}
      >
        <div className="p-3">
          <Input
            type="textarea"
            rows={5}
            value={selectedHistoryRemark}
            readOnly
            className="form-control"
            style={{ width: '100%', resize: 'none', backgroundColor: '#f9f9f9' }}
          />
        </div>
        <div className="d-flex justify-content-end p-2">
          <Button label="Close" icon="pi pi-times" onClick={() => setHistoryRemarksVisible(false)} className="p-button-danger" />
        </div>
      </Dialog>
    </>

  );
};

export default PurchaseRequisitionApproval;
