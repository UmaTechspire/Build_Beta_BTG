using DocumentFormat.OpenXml.Wordprocessing;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Core.Procurement.GoodsReceiptNote
{
    public class GoodsReceiptNote
    {
        public GoodsReceiptNoteHeader Header { get; set; }
        public List<GoodsReceiptNoteDetail> Details { get; set; }
    }
    public class GoodsReceiptNoteHeader
    {
        public int grnid { get; set; }
        public string grnno { get; set; }
        public string grndate { get; set; }
        public decimal grnvalue { get; set; }
        public int supplierid { get; set; }       
        
       // public string invoiceno { get; set; }
        //public string invoicedate { get; set; }
        public int isactive { get; set; }
        public int userid { get; set; }
        public string createdip { get; set; }
        public string modifiedip { get; set; }
        public int branchid { get; set; }
        public int orgid { get; set; }
        public bool isSubmitted { get; set; }
    }
    public class GoodsReceiptNoteDetail
    {
        public int grndid { get; set; }
        public int grnid { get; set; }
        public int itemid { get; set; }
        public int uomid { get; set; }
        public string dono { get; set; }
        public string dodate { get; set; }
        public decimal poqty { get; set; }
        public decimal alreadyrecqty { get; set; }
        public decimal balanceqty { get; set; }
        public decimal grnqty { get; set; }
        public string containerno { get; set; }
        public decimal costperqty { get; set; }
        public decimal amount { get; set; }
        public int porid { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalAmount { get; set; }
        public int isactive { get; set; }
        public int userid { get; set; }
        public string createdip { get; set; }
        public string modifiedip { get; set; }
        public int poid { get; set; }
    }
}
