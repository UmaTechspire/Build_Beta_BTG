using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Core.Finance.PeriodicPaymentPlan
{
    class Voucher
    {
    }

    public class VoucherHeader
    {
        public string CurrencyCode { get; set; }
        public int IsSupplier { get; set; }
        public string AmountInWord { get; set; }
        public string VoucherDate { get; set; }
        public string PaymentDate { get; set; }
        public string VoucherNo { get; set; }
        public string PaymentTo { get; set; }
        public string PaymentMethod { get; set; }
        public string CompanyName { get; set; }
        public string Address1 { get; set; }
        public string Address2 { get; set; }
        public string Address3 { get; set; }
        public string Email { get; set; }
        public string WebSite { get; set; }
        public string TelePhone { get; set; }
        public string Header { get; set; }
    }

    public class VoucherDetail
    {
        public string po { get; set; }
        public string purpose { get; set; }
        public string claimno { get; set; }
        public string AccountNo { get; set; } // or Code, depending on type
        public string AccountName { get; set; } // or null for operational
        public string Description { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; }
        public string Code { get; set; }
    }

    public class SignatureLabel
    {
        public string Value { get; set; }
        public string Label { get; set; }
    }
}
