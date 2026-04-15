import React, { useEffect, useState, useRef } from "react";
import { GetPaymentVoucher } from "common/data/mastersapi";
import { toWords } from 'number-to-words';
import useAccess from "../../common/access/useAccess";


const PaymentVoucher = ({ VoucherId }) => {
  const { access, applyAccessUI } = useAccess("Claim", "PPP");

  useEffect(() => {
    if (!access.loading) {
      applyAccessUI();
    }
  }, [access, applyAccessUI]);

  const [voucherData, setVoucherData] = useState(null);
  const printRef = useRef();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    async function fetchData() {
      const response = await GetPaymentVoucher(VoucherId, 1, 1);
      if (response.status) {
        setVoucherData(response.data);

      }
    }
    fetchData();
  }, [VoucherId]);


  useEffect(() => {
    if (voucherData != null && voucherData && voucherData.details?.length > 0) {
      debugger;
      // Calculate the total amount
      const total = voucherData.details.reduce((sum, item) => sum + item.amount, 0);
      const [dollars, cents] = total.toFixed(2).split('.');

      // Handle currency names for various codes
      const currencyNames = {
        IDR: 'Rupiah',
        USD: 'Dollar',
        MYR: 'Ringgit',
        SGD: 'Dollar',
        CNY: 'Yuan',
      };

      const currencyName = currencyNames[voucherData?.header?.currencyCode] || voucherData?.header?.currencyCode;

      // Convert the dollar part of the total into words (capitalized)
      let result = `${toWords(Number(dollars)).replace(/\b\w/g, c => c.toUpperCase())} ${Number(dollars) !== 1 ? '' : ''}`;

      // If there are cents, add them in words with "Cent" suffix
      if (Number(cents) > 0) {
        result += ` and ${toWords(Number(cents)).replace(/\b\w/g, c => c.toUpperCase())} Cent${Number(cents) !== 1 ? '' : ''}`;
      }

      // Append the currency name and pluralize it if the amount is greater than 1
      result += ` ${currencyName}${Number(dollars) !== 1 ? '' : ''}`;

      // Set the final result as words
      setWords(result);
    }
  }, [voucherData]);

  // useEffect(() => {
  //   if (voucherData && voucherData.details?.length > 0) {
  //     const total = voucherData.details.reduce((sum, item) => sum + item.amount, 0);
  //     const [dollars, cents] = total.toFixed(2).split('.');
  //     let result = `${toWords(Number(dollars)).replace(/\b\w/g, c => c.toUpperCase())} ${Number(dollars) !== 1 ? '' : ''}`;
  //     if (Number(cents) > 0) {
  //       result += ` and ${toWords(Number(cents)).replace(/\b\w/g, c => c.toUpperCase())} Cent${Number(cents) !== 1 ? '' : ''}`;
  //     }
  //     setWords(result);
  //   }
  // }, [voucherData]);

  const [words, setWords] = useState('');



  if (!voucherData) return <div>Loading...</div>;

  const { header, details, signatures } = voucherData;
  const total = details.reduce((sum, item) => sum + item.amount, 0);

  const polist = Array.from(
    new Set(details
      .map(d => d.po)
      .filter(Boolean))      // remove null/empty
  ).join(', ');

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML;
    const newWin = window.open("", "Print-Window");
    newWin.document.open();
    newWin.document.write(`
      <html>
        <head>
          <title>Voucher</title>
           <style>
          @media print {
           .print-footer {
           position: fixed;
           top: 0;
           left: 0;
           right: 0;
           text-align: right;
           font-size: 10px;
  
          }
          .header-top div, .header-top img{display:none;}
  .print-section {
    page-break-inside: avoid;   /* Keep the whole block on one page */
    break-inside: avoid;        /* Newer spec name */
  }

  .signature-table, .signature-cell {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
            @page {
              size: A5 landscape;
             margin: 5mm;
            }
  
            body {
              font-family: Arial, sans-serif;
              font-size: 11.5px;
              margin: 0;
              color: #000;
              zoom: 0.95;
            }
  
            /* ---------- Header ---------- */
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 8px;
              border-bottom: 0.5px solid #000;
              padding-bottom: 4px;
            }
  
            .header-left {
              display: flex;
              align-items: center;
            }
  
            .header-left img {
              height: 40px;
              margin-right: 8px;
            }
  
            .header-text {
              line-height: 1.2;
            }
  
            .header-text h2 {
              margin: 0;
              font-size: 16px;
              font-weight: bold;
            }
  
            .header-text p {
              margin: 0;
              font-size: 12px;
            }
  
            /* ---------- Table ---------- */
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
             
            }
  
            th, td {
              padding: 6px 8px;
              border: 0px solid #000;
              font-size: 11px;
              color:black;
            }
  
            th {
              background-color: #007bff;
              color:black;
              text-align: center;
            }
  
            td.cell-center {
              text-align: center;
            }
  
            td.cell-right {
              text-align: right;
            }
  
            /* Column widths for better structure */
            table th:nth-child(1), td:nth-child(1) { width: 3%; }
            table th:nth-child(2), td:nth-child(2) { width: 10%; }
            table th:nth-child(3), td:nth-child(3) { width: 62%; }
            table th:nth-child(4), td:nth-child(4) { width: 14%; }
            table th:nth-child(5), td:nth-child(5) { width: 12%; }
            table th:nth-child(6), td:nth-child(6) { width: 12%; text-align: right; }
  
            .total-row td {
              font-weight: bold;
              background-color: #f2f2f2;
            }
  
            /* ---------- Signature Section ---------- */
            .signature-table {
              width: 100%;
              margin-top: 30px;
              table-layout: fixed;
            }
  
            .signature-cell {
              width: 40%;
              border-top: 0.5px solid #000;
              text-align: center;
              padding: 12px 0 6px;
              font-size: 11px;
            }
   
            /* ---------- Footer ---------- */
            .footer {
              margin-top: 20px;
              font-size: 10px;
              display: flex;
              justify-content: space-between;
              border-top: 0.5px dashed #999;
              padding-top: 6px;
            }
  .header-bottom table th td {border:0px;}
            /* ---------- Amount in Words ---------- */
            .amount-words {
              margin-top: 10px;
              font-weight: bold;
              font-style: italic;
            }
          </style>
        </head>
        <body onload="window.print(); setTimeout(() => window.close(), 100);">
          <table>
            <!-- Repeated header/logo -->
            <thead>
              <tr>
                <td>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <img src="/logo.png" style="height:90px; width:100px;" />
                    <div>
                      <p style="font-weight:bold;">${header.companyName}</p>
                      <p>${header.address1}, ${header.address2}, ${header.address3}</p>
                      <p>${header.webSite} ${header.email}</p>
                      <p>${header.telePhone}</p>
                    </div>
                  </div>
                </td>
              </tr>
            </thead>
  
            <!-- Body content -->
            <tbody>
              <tr>
                <td>
                  <div class="print-body">
                    ${printContents}
                     <div class="print-footer">
        Printed on ${new Date().toLocaleString()}
      </div>
                  </div>
                </td>
              </tr>
            </tbody>
  
            <!-- Footer -->
         
          </table>
        </body>
      </html>
    `);
    newWin.document.close();
  };




  return (
    <div>

      <div style={{ textAlign: "right", marginBottom: 0 }}>
        {/* <button onClick={handlePrint} style={styles.printButton}>Print</button> */}
        {/* <button onClick={handlePrint} style={styles.ackButton}>ACK</button> */}
      </div>

      <div ref={printRef} style={styles.container}>
        {/* Header Top */}
        <div className="header-top" style={styles.headerTop}>
          <div className="header-left" style={styles.headerLeft}>
            <img src="/logo.png" alt="Logo" style={styles.logo} />
            <div>

              <p style={styles.company}><strong>{header.companyName}</strong></p>
              <p style={styles.address}>{header.address1}, {header.address2}, {header.address3}</p>
              <p style={styles.address}>{header.webSite} {header.email}</p>
              <p style={styles.address}>{header.telePhone}</p>
            </div>
          </div>
        </div>

        <div
          className="header-center"
          style={{
            ...styles.headerCenter,
            textTransform: "uppercase",   // ✅ makes it CAPITAL
            fontSize: "1rem",          // ✅ bigger (20px if base is 16px)
            fontWeight: "600"             // ✅ optional, makes it bolder
          }}
        >
          {header.header}
        </div>
        <div style={{ width: 320 }} />
        {/* Header Bottom */}



        {/* 
        <div className="header-bottom" style={styles.headerBottom}>
          <div>
            <div style={{width:"100%",display:"flex"}}>
            <p style={styles.labelStyle}>Payment To</p> : <span style={styles.normalText}>{header.paymentTo}</span>
            </div>
            <div style={{width:"100%",display:"flex"}}>
            <p style={styles.labelStyle}>Payment Method</p> :<span style={styles.normalText}>{header.paymentMethod}</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
          <div style={{width:"100%",display:"flex"}}>
            <p style={styles.RlabelStyle}>PV #</p> : <span style={styles.normalText}>{header.voucherNo}</span>  </div>
            <div style={{width:"100%",display:"flex"}}>
            <p style={styles.RlabelStyle}>Date </p> : <span style={styles.normalText}>{header.voucherDate}</span>  </div>
          </div>
        </div> */}

        <div className="header-bottom" style={styles.headerBottomContainer}>
          <table style={styles.twoColTable}>
            <tbody>
              <tr>
                <td style={styles.leftLabel}><strong>Payment To</strong></td>
                <td style={styles.dotValue}> :  </td>

                <td style={styles.leftValue}>  {header.paymentTo}</td>
                <td style={styles.leftValue}> </td>

                <td style={styles.rightLabel}><strong>PV #</strong></td>
                <td style={styles.dotValue}> :  </td>
                <td style={styles.rightValue}>  {header.voucherNo}</td>
              </tr>
              <tr>
                <td style={styles.leftLabel}><strong>Payment Method</strong></td>
                <td style={styles.dotValue}> :  </td>
                <td style={styles.leftValue}> {header.paymentMethod}</td>
                <td style={styles.leftValue}> </td>

                <td style={styles.rightLabel}><strong>Date</strong></td>
                <td style={styles.dotValue}> :  </td>
                <td style={styles.rightValue}>  {header.voucherDate}</td>
              </tr>
              {(header.paymentMethod === "Cash" || details[0]?.accountName) && (
                <tr>
                  <td style={styles.leftLabel}><strong>Account Name</strong></td>
                  <td style={styles.dotValue}> : </td>
                  <td style={styles.leftValue}> {header.paymentMethod === "Cash" ? "Cash in hand" : details[0]?.accountName}</td>
                </tr>
              )}
              {header.isSupplier == 1 && (
                <tr>
                  <td style={styles.leftLabel}><strong>PO & WO</strong></td>
                  <td style={styles.dotValue}> :  </td>
                  <td style={styles.leftValue} colSpan={5}> {polist}</td>


                </tr>)}
            </tbody>
          </table>
        </div>



        {/* Payment Details */}

        {header.isSupplier == 1 ? (

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.cellCenter, width: "3%", backgroundColor: "#f2f2f2", color: "#000" }}>No</th>
                <th style={{ ...styles.cellCenter, width: "10%", backgroundColor: "#f2f2f2", color: "#000" }}>Claim No</th>
                {/* <th style={styles.cellCenter}>Account No</th> */}
                {/* <th style={styles.cellCenter}>Account Name</th> */}
                {/* <th style={{...styles.cellCenter,width:"20%"}}>Description</th> */}
                <th style={{ ...styles.cellCenter, width: "62%", backgroundColor: "#f2f2f2", color: "#000" }}>Purpose</th>
                <th style={{ ...styles.cellCenter, width: "14%", backgroundColor: "#f2f2f2", color: "#000" }}>Amount {header.currencyCode} </th>
              </tr>
            </thead>
            <tbody>
              {details.map((item, idx) => (
                <tr key={idx}>
                  <td style={styles.cellCenter}>{idx + 1}</td> {/* Serial Number */}

                  <td style={styles.cell}>{item.claimno}</td>
                  {/* <td style={styles.cell}>{item.accountNo || '-'}</td> */}
                  {/* <td style={styles.cell}>{item.accountName || '-'}</td> */}
                  {/* <td style={styles.cellleft}>{item.description}</td> */}
                  <td style={styles.cellleft}>{item.purpose}</td>
                  <td style={styles.cellRight}>{item.amount.toLocaleString()}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ ...styles.cellCenter, fontWeight: "bold" }}>TOTAL</td>
                <td style={{ ...styles.cellRight, fontWeight: "bold" }}>{total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.cellCenter, backgroundColor: "#f2f2f2", color: "#000" }}>No</th>
                <th style={{ ...styles.cellCenter, backgroundColor: "#f2f2f2", color: "#000" }}>Claim No</th>
                {/* <th style={styles.cellCenter}>Code</th> */}
                {/* <th style={styles.cellCenter}>Description</th> */}
                <th style={{ ...styles.cellCenter, backgroundColor: "#f2f2f2", color: "#000" }}>Purpose</th>
                <th style={{ ...styles.cellCenter, backgroundColor: "#f2f2f2", color: "#000" }}>Amount {header.currencyCode} </th>
              </tr>
            </thead>
            <tbody>
              {details.map((item, idx) => (
                <tr key={idx}>
                  <td style={styles.cellCenter}>{idx + 1}</td> {/* Serial Number */}

                  <td style={styles.cell}>{item.claimno}</td>
                  {/* <td style={styles.cell}>{item.code || '-'}</td> */}
                  {/* <td style={styles.cellleft}>{item.description}</td> */}
                  <td style={styles.cellleft}>{item.purpose}</td>
                  <td style={styles.cellRight}> {item.amount.toLocaleString()}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ ...styles.cellCenter, fontWeight: "bold" }}>TOTAL</td>
                <td style={{ ...styles.cellRight, fontWeight: "bold" }}>  {total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        )
        }
        {/* Amount in Words */}
        <p style={{ marginTop: 20 }}><strong>Amount in Words :</strong> {words}  </p>

        {/* Signature Section */}
        {/* <table >
          <tbody>
            <tr> */}


        {/* <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{float:"left"}}>
              {signatures.map((sig, idx) => (
                <span key={idx} >
               
                  <div> {sig.label} </div>
                </span>
              ))}
              </span>
    <div
      style={{
        border: "1px solid black",
        width: "200px",
        height: "80px",
        marginBottom: "5px",
      }}
    >  
      </div>
    <span>{"Applicant's Signature"}</span>
  
</div> */}
        {/* Signature Section */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px" }}>
          {/* Left side - Approved by (GM, Director, Commissioner) */}
          <div style={{ display: "flex", gap: "40px" }}>
            {signatures.map((sig, idx) => (
              <div key={idx} style={{ textAlign: "center" }}>

                <span>{sig.label}</span>
              </div>
            ))}
          </div>

          {/* Right side - Applicant’s Signature */}

          {(header.paymentMethod == "Cash" || header.paymentMethod == "Cheque") && (
            <div className="print-section" style={{ textAlign: "center" }}>
              <div
                style={{
                  border: "1px solid black",
                  width: "200px",
                  height: "50px",
                  marginBottom: "5px",
                }}
              ></div>
              <span>{`Applicant's Signature`}</span>
            </div>
          )}
        </div>

        {/* </tr>
          </tbody>
        </table> */}

        {/* Footer */}
        {/* <div style={styles.footer}>
          <span>Printed on {currentTime.toLocaleString()} </span>
         
            
        </div> */}
      </div>
      <div style={{ textAlign: "right", marginBottom: 0 }}>
        {access?.canPrint && (
          <button onClick={handlePrint} style={styles.printButton}>Print</button>
        )}
        {/* <button onClick={handlePrint} style={styles.ackButton}>ACK</button> */}
      </div>
    </div>
  );
};

const styles = {
  labelStyle: {

    width: 120,  // fixed width for label + colon
    fontWeight: "bold",
  },
  RlabelStyle: {
    textAlign: "left",
    width: 60,  // fixed width for label + colon
    fontWeight: "bold",
  },
  address: { marginBottom: "1px" },
  company: { fontWeight: "bold", marginBottom: "2px" },
  container: {
    padding: 30,
    fontFamily: "Arial, sans-serif",
    fontSize: 14,
    color: "#000",
    backgroundColor: "#fff",
  },
  printButton: {
    cursor: "pointer",
    padding: "8px 16px",
    backgroundColor: "#007bff",
    border: "none",
    borderRadius: 4,
    color: "#fff",
    fontWeight: "bold",

  },
  ackButton: {
    marginLeft: "5px",
    cursor: "pointer",
    padding: "8px 16px",
    backgroundColor: "rgb(53 153 31)",
    border: "none",
    borderRadius: 4,
    color: "#fff",
    fontWeight: "bold",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 5,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    lineHeight: 1.3,
    gap: 15,

  },
  logo: {
    height: 90,
    marginBottom: 5,
  },
  headerCenter: {
    flexGrow: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
    letterSpacing: 2,
  },
  headerBottom: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20,
    fontWeight: 600,
    fontSize: 14,
    lineHeight: 1.5,
  },
  normalText: {
    fontWeight: "normal",
    marginLeft: 5,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 10,
    border: "1px solid #000",
  },
  cell: {
    padding: 8,
    border: "1px solid #000",
  },
  cellCenter: {
    padding: 8,
    border: "1px solid #000",
    textAlign: "center",
  },
  cellCenterpurpose: {
    padding: 8,
    border: "1px solid #000",

    width: "45%"
  },
  cellRight: {
    padding: 8,
    border: "1px solid #000",
    textAlign: "right",
  },
  cellleft: {
    padding: 8,
    border: "1px solid #000",
    textAlign: "left",
  },
  signatureTable: {
    width: "100%",
    textAlign: "center",
    marginTop: 40,
    borderCollapse: "collapse",
  },
  signatureCell: {
    borderBottom: "1px solid #000",
    padding: 10,
  },
  footer: {
    marginTop: 30,
    fontSize: 12,
    display: "flex",
    justifyContent: "space-between",
  },

  headerBottomContainer: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  twoColTable: {
    width: "100%",
    borderCollapse: "separate",  // prevent collapsing borders
    fontSize: 14,
    border: "none",
  },

  leftLabel: {
    width: "80px",
    textAlign: "left",
    padding: "4px 2px",
    verticalAlign: "top",
    border: "none",
  },

  leftColon: {
    width: "10px",
    textAlign: "center",
    padding: "4px 2px",
    border: "none",
  },

  leftValue: {
    width: "220px",
    padding: "4px 2px",
    verticalAlign: "top",
    wordBreak: "break-word",
    border: "none",
  },

  dotValue: {
    width: "2px",
    padding: "4px 2px",
    verticalAlign: "top",
    wordBreak: "break-word",
    border: "none",
  },

  rightLabel: {
    width: "20px",
    textAlign: "left",
    padding: "4px 2px",
    verticalAlign: "top",
    border: "none",
  },

  rightColon: {
    width: "10px",
    textAlign: "center",
    padding: "4px 2px",
    border: "none",
  },

  rightValue: {
    width: "120px",
    padding: "4px 2px",
    verticalAlign: "top",
    border: "none",
  },


};

export default PaymentVoucher;
