import { get, post, put, del } from "../../helpers/api_helper";
import axios from "axios";
import { saveAs } from "file-saver";
import { PYTHON_API_URL } from "common/pyapiconfig";

const transformData = (data, valueParam, labelParam) => {
    return data.map(item => ({
        ...item,
        value: item[valueParam],
        label: item[labelParam]
    }));
};

const gastransformData = (data, valueParam, labelParam) => {
    return data.map(item => ({
        ...item,
        value: item[valueParam],
        label: item[labelParam],
        id: item["Id"]
    }));
};

// =====================================================================
//  PYTHON API FUNCTIONS (Invoices & Sales)
// =====================================================================

export const GetInvoiceDetails = async (invoicesid) => {
    try {
        const response = await axios.get(`${PYTHON_API_URL}/pyapi/GetInvoiceDetails?invoiceid=${encodeURIComponent(invoicesid)}`);

        if (response.status === 200) {
            return response.data;
        } else {
            throw new Error("Failed to fetch invoice details");
        }
    } catch (error) {
        console.error("Error fetching invoice details:", error);
        return null;
    }
};

export const CreatenewInvoice = async (orderData) => {
    try {
        const response = await axios.post(`${PYTHON_API_URL}/pyapi/CreateInvoice`, orderData);

        if (response.status === 200 && response.data.status === "success") {
            // Ensure consistent response format for Frontend
            return { status: true, data: response.data.InvoiceId || response.data.data, message: response.data.message };
        } else {
            throw new Error(response.data.detail || "Failed to create invoice");
        }
    } catch (error) {
        console.error("Error calling Python CreateInvoice:", error);
        return { status: false, message: error.response?.data?.detail || error.message };
    }
};

export const UpdateInvoice = async (orderData) => {
    try {
        // Point to Python Update Endpoint
        const response = await axios.post(`${PYTHON_API_URL}/pyapi/UpdateInvoice`, orderData);

        if (response.status === 200 && response.data.status === true) {
            return { status: true, data: response.data.data, message: response.data.message };
        } else {
            throw new Error(response.data.detail || "Failed to update invoice");
        }
    } catch (error) {
        console.error("Error calling Python UpdateInvoice:", error);
        return { status: false, message: error.response?.data?.detail || error.message };
    }
};

export const GetALLInvoices = async (customerid, FromDate, ToDate, branchId, IsAR = 0) => {
    try {
        const formatDate = (date) => {
            if (!date) return null;
            return typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
        };

        const payload = {
            customerid: parseInt(customerid) || 0,
            FromDate: formatDate(FromDate),
            ToDate: formatDate(ToDate),
            BranchId: parseInt(branchId) || 1,
            IsAR: IsAR
        };

        const config = {
            headers: {
                "Content-Type": "application/json",
            },
        };

        const response = await axios.post(`${PYTHON_API_URL}/pyapi/GetALLInvoices`, payload, config);

        if (response.status === 200) {
            if (response.data && response.data.status === false) {
                console.error("Backend Logic Error:", response.data.message);
                throw new Error(response.data.message || "Backend reported failure");
            }

            if (Array.isArray(response.data)) {
                return { status: true, data: response.data };
            }

            if (response.data && response.data.data) {
                return { status: true, data: response.data.data };
            }

            return { status: true, data: response.data };
        } else {
            throw new Error("Failed to fetch invoices from Python API");
        }

    } catch (error) {
        console.error("Error fetching invoices from Python API:", error);
        return {
            status: false,
            data: [],
            message: error.message || "Network Error"
        };
    }
};

export const GetSalesDetails = async (filterData) => {
    try {
        const response = await axios.post(`${PYTHON_API_URL}/pyapi/GetSalesDetails`, filterData);

        if (response.status === 200) {
            return response.data;
        }
        return [];
    } catch (error) {
        console.error("Error fetching sales details:", error);
        return [];
    }
};

export const GetItemFilter = async () => {
    try {
        const response = await axios.get(`${PYTHON_API_URL}/pyapi/GetItemFilter`);
        if (response.status === 200) {
            return response.data;
        } else {
            return [];
        }
    } catch (error) {
        console.error("Error fetching item filter:", error);
        return [];
    }
};

export const GetGasItems = async () => {
    try {
        const response = await axios.get(`${PYTHON_API_URL}/pyapi/GetGasItems`);

        if (response.status === 200 && response.data.status) {
            return response.data.data.map(item => ({
                label: item.GasName,
                value: item.Id
            }));
        } else {
            return [];
        }
    } catch (error) {
        console.error("Error fetching gas items:", error);
        return [];
    }
};

export const GetAvailableDOs = async (filterData) => {
    try {
        const response = await axios.post(`${PYTHON_API_URL}/pyapi/GetAvailableDOs`, filterData);

        if (response.status === 200 && response.data.status) {
            return response.data.data; // Return array directly
        }
        return [];
    } catch (error) {
        console.error("Error fetching available DOs:", error);
        return [];
    }
};

export const CreateInvoiceFromDO = async (payload) => {
    try {
        const response = await axios.post(`${PYTHON_API_URL}/pyapi/CreateInvoiceFromDO`, payload);

        if (response.status === 200 && response.data.status) {
            return response.data;
        } else {
            throw new Error(response.data.message || "Failed");
        }
    } catch (error) {
        console.error("Error creating invoice from DO:", error);
        throw error;
    }
};

export const GetSalesCommission = async (customerId, gasId, invoiceDate) => {
    try {
        const response = await axios.get(`${PYTHON_API_URL}/pyapi/GetSalesCommission`, {
            params: {
                customerId,
                gasId,
                invoiceDate: typeof invoiceDate === 'string' ? invoiceDate : new Date(invoiceDate).toISOString().split('T')[0]
            }
        });

        if (response.status === 200) {
            return response.data;
        }
        return { found: false, sellingPrice: 0, commissions: [] };
    } catch (error) {
        console.error("Error fetching sales commission from Python API:", error);
        return { found: false, sellingPrice: 0, commissions: [] };
    }
};

// =====================================================================
//  EXISTING .NET API FUNCTIONS (Unchanged / Fallback)
// =====================================================================

export const GetInvoiceSNo = async (branchId, type) => {
    try {
        const response = await get(`/Invoices/GetInvoicesSiNo?BranchId=${branchId}&type=${type}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetDownloaddo = async (PackId) => {
    try {
        const response = await get(`/PackingAndDO/DownloadDO?PackId=${PackId}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};


// Get BASE_URL from environment variable (same as used by api_helper)
const BASE_URL = process.env.REACT_APP_API_URL;

if (!BASE_URL) {
    throw new Error("REACT_APP_API_URL is not defined in .env file");
}

export const downloadExcel = async (PackId, PackNo) => {
    try {
        const response = await axios.get(
            `${BASE_URL}/PackingAndDO/DownloadDO?PackId=${PackId}`,
            {
                responseType: "blob",
            }
        );

        if (response.status) {
            const contentDisposition = response.headers["content-disposition"];
            const now = new Date();
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const day = String(now.getDate()).padStart(2, "0");
            const month = months[now.getMonth()];
            const year = now.getFullYear();
            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, "0");
            const ampm = hours >= 12 ? "pm" : "am";
            hours = hours % 12 || 12;
            const timeStr = `${hours}:${minutes}${ampm}`;
            let fileName = `BTG-${PackNo}-${day}${month}${year}-${timeStr}.xlsx`;

            if (contentDisposition) {
                const matches = contentDisposition.match(/filename="?(.+)"?/);
                if (matches && matches[1]) {
                    fileName = matches[1];
                }
            }

            const blob = new Blob([response.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            saveAs(blob, fileName);
            return response;
        } else {
            return response;
        }
    } catch (err) {
        console.error("Error downloading file:", err.message);
    }
};

export const uploadDOFile = async (PackId, file, PackingNo) => {
    try {
        const formData = new FormData();
        formData.append("PackingNo", PackingNo);
        formData.append("file", file);

        const response = await axios.post(`${BASE_URL}/PackingAndDO/UploadDO?PackId=${PackId}`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        if (response.status) {
            console.log("File uploaded successfully!", response.data);
            return response.data;
        } else {
            throw new Error(response.data.message || "Failed to upload file.");
        }
    } catch (err) {
        console.error("Error uploading file:", err.message);
        throw err;
    }
};

export const uploadAckDOFile = async (PackId, file, PackingNo, UserId = 1) => {
    try {
        const formData = new FormData();
        formData.append("PackingNo", PackingNo);
        formData.append("file", file);

        const response = await axios.post(`${BASE_URL}/PackingAndDO/UploadACK?PackId=${PackId}&UserId=1`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        if (response.status) {
            console.log("File uploaded successfully!", response.data);
            return response.data;
        } else {
            throw new Error(response.data.message || "Failed to upload file.");
        }
    } catch (err) {
        console.error("Error uploading file:", err.message);
        throw err;
    }
};

export const printExportExcel = async (packerid, FromDate, ToDate, branchId, GasCodeId, customerid, esttime) => {
    try {
        const response = await axios.get(
            `${BASE_URL}/PackingAndDO/GetAllExportAsync?Types=2&packerid=${packerid}&FromDate=${FromDate}&ToDate=${ToDate}&BranchId=${branchId}&GasCodeId=${GasCodeId}&customerid=${customerid}&esttime=${esttime}&packer_id=${packerid}`,
            { responseType: "blob" }
        );
        if (response.status === 200) {
            return response.data;
        }
    } catch (err) {
        console.error("Error downloading file:", err.message);
        throw err;
    }
};

export const downloadPackingExportExcel = async (packerid, FromDate, ToDate, branchId, GasCodeId, customerid, esttime) => {
    try {
        const response = await axios.get(
            `${BASE_URL}/PackingAndDO/GetAllExportAsync?Types=2&packerid=${packerid}&FromDate=${FromDate}&ToDate=${ToDate}&BranchId=${branchId}&GasCodeId=${GasCodeId}&customerid=${customerid}&esttime=${esttime}&packer_id=${packerid}`,
            {
                responseType: "blob",
            }
        );

        if (response.status) {

            const contentDisposition = response.headers["content-disposition"];
            const now = new Date();
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const day = String(now.getDate()).padStart(2, "0");
            const month = months[now.getMonth()];
            const year = now.getFullYear();
            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, "0");
            const ampm = hours >= 12 ? "pm" : "am";
            hours = hours % 12 || 12;
            const timeStr = `${hours}:${minutes}${ampm}`;
            let fileName = `BTG-Packing-${day}${month}${year}-${timeStr}.xlsx`;
            if (contentDisposition) {
                const matches = contentDisposition.match(/filename="?(.+)"?/);
                if (matches && matches[1]) {
                    fileName = matches[1];
                }
            }

            const blob = new Blob([response.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            saveAs(blob, fileName);
            return response;
        } else {
            return response;
        }
    } catch (err) {
        console.error("Error downloading file:", err.message);
    }
};

export const GetALLPackingDelivery = async (packerid, FromDate, ToDate, branchId, GasCodeId, customerid, esttime) => {
    try {
        const response = await get(`/PackingAndDO/GetALL?packerid=${packerid}&FromDate=${FromDate}&ToDate=${ToDate}&BranchId=${branchId}&GasCodeId=${GasCodeId}&customerid=${customerid}&esttime=${esttime}&packer_id=${packerid}`);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const packingstage = async (packingId, stageId, branchId = 1) => {
    try {
        const requestBody = {
            packingId,
            stageId,
            branchId,
        };
        const response = await post("/PackingAndDO/change-packing-stage", requestBody);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to update stage");
        }
    } catch (error) {
        console.error("Error updating stage:", error);
        return null;
    }
};

export const GetBarcodeDetails = async (PackingId, barcode, selectedDONOId) => {
    try {
        const response = await get(`/OrderMngMaster/GetBarcodeDetails?Barcode=${barcode}&PackingId=${PackingId}&doid=${selectedDONOId}`);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const SaveBarcodeScan = async (PackingId, rackid) => {
    try {
        const response = await get(`/Barcode/SaveBarcodeScan?PackingId=${PackingId}&rackid=${rackid}`);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};


export const GetRackDetails = async (branchId = 1) => {
    try {
        const response = await get(`/ordermngmaster/GetRackDetails?branchid=${branchId}`);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetCustomerFilter = async (branchId = 1, searchtext) => {
    try {
        const response = await get(`/ordermngmaster/GetCustomerFilter?branchid=${branchId}&searchtext=${searchtext}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetPackerautoList = async (branchId = 1, searchtext) => {
    try {
        const response = await get(`/ordermngmaster/GetPackerList?branchid=${branchId}&searchtext=${searchtext}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetPackingpackno = async (branchId) => {
    try {
        const response = await get(`/PackingAndDO/GetPackingPackNo?BranchId=${branchId}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetPackerList = async (branchId) => {
    try {
        const response = await get(`/ordermngmaster/GetPackerSName?BranchId=${branchId}`);
        if (response?.status) {
            return transformData(response.data, 'Id', 'PackerName');
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const Getgascodeagainstcustomer = async (customerid, branchId) => {
    try {
        const response = await get(`/ordermngmaster/Getgascodeagainstcustomer?CustomerId=${customerid}&branchid=${branchId}`);
        if (response?.status) {
            let resultarray = {};
            resultarray.gas = transformData(response.data.Gas, 'Id', 'gascode');
            resultarray.so = gastransformData(response.data.SO, 'SO_ID', 'SO_Number');
            return resultarray;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetSOagainstGas = async (GasCodeId, branchId) => {
    try {
        const response = await get(`/ordermngmaster/GetSOagainstGas?GasCodeId=${GasCodeId}&branchid=${branchId}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetPackingCustomers = async (branchId) => {
    try {
        const response = await get(`/OrderMngMaster/GetsaleordercustomerId?BranchId=${branchId}`);
        if (response?.status) {
            return transformData(response.data, 'CustomerID', 'CustomerName');
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetPackingSOList = async (customerid, branchId, PackingId) => {
    try {
        const response = await get(`/OrderMngMaster/GetPackingSO?customerid=${customerid}&BranchId=${branchId}&PackingId=${PackingId}`);
        if (response?.status) {
            return transformData(response.data, 'SO_ID', 'SO_Number');
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetPackingSODetail = async (soid, branchId) => {
    try {
        const response = await get(`/OrderMngMaster/GetPackingSODetail?soid=${soid}&BranchId=${branchId}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetStagedata = async (branchId) => {
    try {
        const response = await get(`/OrderMngMaster/GetStagedata?branchid=${branchId}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const CreateAutoInvoice = async (orderData) => {
    try {
        const response = await post(`/PackingAndDO/GenerateInvoice`, orderData);
        if (response) {
            return response;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const BarcodeMachineScan = async (Data) => {
    try {
        const response = await post(`/PackingAndDO/BarcodeMachineScan`, Data);
        if (response) {
            return response;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const PackingConfirmed = async (Data) => {
    try {
        const response = await post(`/PackingAndDO/PackingConfirmed`, Data);
        if (response) {
            return response;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const CreatePacking = async (PorderData) => {
    try {
        const response = await post('/PackingAndDO/Create', PorderData);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
};

export const GetPdlById = async (pdlid) => {
    try {
        const response = await get(`/PackingAndDO/GetById?id=${pdlid}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
};

export const GetgasCodeData = async (BranchId, SearchText) => {
    try {
        const response = await get(`/OrderMngMaster/GetgasCodeData?BranchId=${BranchId}&SearchText=${SearchText}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
};


export const GetInvoiceData = async (pdlid) => {
    try {
        const response = await get(`/PackingAndDO/GetInvoiceData?PackingId=${pdlid}`);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
};

export const UpdatePacking = async (PorderData) => {
    try {
        const response = await put('/PackingAndDO/Update', PorderData);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
};

export const packingacknoledgement = async (PorderData) => {
    try {
        const response = await put('/PackingAndDO/packingacknoledgement', PorderData);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
};

export const searchReturnOrders = async (filters) => {
    try {
        const queryParams = new URLSearchParams();

        if (filters.GasCode) queryParams.append("GasCode", filters.GasCode);
        if (filters.Customer) queryParams.append("Customer", filters.Customer);
        if (filters.FromDate) queryParams.append("FromDate", filters.FromDate);
        if (filters.ToDate) queryParams.append("ToDate", filters.ToDate);
        if (filters.BranchId) queryParams.append("BranchId", filters.BranchId);
        const queryString = queryParams.toString();
        const response = await get(`/ReturnOrder/GetALL?${queryString}`);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetBarcodePackingList = async ({ packingId, barcode, donoId }) => {
    try {
        console.log("Calling API with:", { packingId, barcode, donoId });

        const response = await get(
            `/OrderMngMaster/GetBarcodeDetails?Barcode=${barcode}&PackingId=${packingId}&doid=${donoId}`
        );

        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch barcode details.");
        }
    } catch (error) {
        console.error("Error fetching barcode packing list:", error);
        return [];
    }
};


const buildQuery = (params) =>
    Object.entries(params)
        .filter(([_, v]) => v !== null && v !== undefined && v !== "" && v !== "null")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");


export const printExportExcelPacking = async (branchId) => {
    try {
        const response = await axios.get(
            `${BASE_URL}/PackingListOrder/GetAllExportAsync?Types=2&BranchId=${branchId}`,
            { responseType: "blob" }
        );
        if (response.status === 200) {
            return response.data;
        }
    } catch (err) {
        console.error("Error downloading file:", err.message);
        throw err;
    }

};
export const getPackingAndDODocPrintId = async (filters) => {
    try {
        const queryString = buildQuery(filters);

        const response = await get(`/PackingAndDO/docprintId?${queryString}`);

        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch Packing & DO DocPrintId data.");
        }
    } catch (error) {
        console.error("Error fetching PackingAndDO docprintId:", error);
        return [];
    }
};