import { Receipt } from '../types';
import { format } from 'date-fns';

export const printReceipt = (receipt: Receipt, schoolInfo: {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
}) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to print the receipt.');
    return;
  }

  const formatCurrency = (amt: number) => `₹${Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const breakdownRows = (receipt.monthly_breakdown || []).map(row => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
      <td style="padding: 8px 12px;">${format(new Date(row.month + '-01'), 'MMMM yyyy')}</td>
      <td style="padding: 8px 12px; text-align: right;">${row.fee}</td>
      <td style="padding: 8px 12px; text-align: right; font-weight: bold;">${row.paid}</td>
      <td style="padding: 8px 12px; text-align: right;">${row.due}</td>
    </tr>
  `).join('');

  const generateReceiptHTML = (copyLabel: string) => `
    <div style="background: white; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; height: 100%; box-sizing: border-box;">
      <div style="display: flex; justify-content: flex-end; margin-bottom: 4px;">
        <span style="font-size: 9px; font-weight: bold; border: 1.5px solid #000; padding: 2px 6px; text-transform: uppercase; letter-spacing: 0.5px;">
          ${copyLabel}
        </span>
      </div>

      <div style="text-align: center; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 12px;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 4px;">
          ${schoolInfo.logoUrl ? `<img src="${schoolInfo.logoUrl}" style="height: 40px; width: auto;" />` : ''}
          <div style="text-align: left;">
            <h1 style="font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 0; line-height: 1; letter-spacing: -0.5px;">AEROVAX SCHOOL SYSTEM</h1>
            <h2 style="font-size: 16px; font-weight: 700; margin: 2px 0 0 0; color: #334155;">${schoolInfo.name}</h2>
          </div>
        </div>
        <p style="font-size: 10px; font-weight: 600; opacity: 0.9; text-transform: uppercase; margin: 4px 0 0 0; letter-spacing: 0.2px;">
          ${schoolInfo.address}
        </p>
        <p style="font-size: 10px; font-weight: 500; margin: 2px 0 0 0;">
          Phone: ${schoolInfo.phone} | Email: ${schoolInfo.email}
        </p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px;">
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 4px;">
            <span style="font-weight: bold; text-transform: uppercase; font-size: 9px; color: #64748b;">Receipt No</span>
            <span style="font-family: 'Courier New', Courier, monospace; font-weight: bold;">${receipt.receipt_no}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
            <span style="font-weight: bold; text-transform: uppercase; font-size: 9px; color: #64748b;">Date</span>
            <span style="font-weight: 500;">${format(new Date(receipt.date), 'dd MMM yyyy, hh:mm a')}</span>
          </div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 4px;">
            <span style="font-weight: bold; text-transform: uppercase; font-size: 9px; color: #64748b;">Method</span>
            <span style="text-transform: uppercase; font-weight: 600;">${receipt.payment_method}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
            <span style="font-weight: bold; text-transform: uppercase; font-size: 9px; color: #64748b;">Status</span>
            <span style="font-weight: 800; color: ${receipt.payment_status === 'PAID' ? '#059669' : '#d97706'}">${receipt.payment_status}</span>
          </div>
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 8px 16px; margin-bottom: 16px; border-radius: 4px;">
        <div style="display: flex; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px;">
          <span style="width: 80px; font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b;">Student</span>
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase;">${receipt.student_metadata?.name || 'N/A'}</span>
        </div>
        <div style="display: flex; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px;">
          <span style="width: 70px; font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b;">Class</span>
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase;">${receipt.student_metadata?.class || 'N/A'}</span>
        </div>
        <div style="display: flex; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px;">
          <span style="width: 80px; font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b;">Roll No</span>
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase;">${receipt.student_metadata?.roll_no || 'N/A'}</span>
        </div>
        <div style="display: flex; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px;">
          <span style="width: 70px; font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b;">Section</span>
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase;">${receipt.student_metadata?.section || 'N/A'}</span>
        </div>
        <div style="display: flex; grid-column: span 2; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px;">
          <span style="width: 80px; font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b;">Parent</span>
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase;">${receipt.student_metadata?.father_name || receipt.student_metadata?.mother_name || 'N/A'}</span>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f1f5f9; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; text-transform: uppercase; font-size: 9px;">
            <th style="padding: 6px 10px; text-align: left;">Description</th>
            <th style="padding: 6px 10px; text-align: right;">Amount (₹)</th>
            <th style="padding: 6px 10px; text-align: right;">Paid (₹)</th>
            <th style="padding: 6px 10px; text-align: right;">Due (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${breakdownRows}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
        <div style="width: 100%;">
          <div style="display: flex; justify-content: flex-end; gap: 40px; border-bottom: 1.5px solid #000; padding-bottom: 4px;">
            <div style="text-align: right;">
              <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b;">Total Received</div>
              <div style="font-size: 15px; font-weight: 800;">${formatCurrency(receipt.amount)}</div>
            </div>
            <div style="text-align: right; border-left: 1px solid #e2e8f0; padding-left: 20px;">
              <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #e11d48;">Remaining Due</div>
              <div style="font-size: 15px; font-weight: 800; color: #e11d48;">${formatCurrency(receipt.remaining_due)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 32px;">
        <div style="text-align: center; width: 140px;">
          <div style="border-top: 1px solid #000; padding-top: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase;">
            Parent/Guardian
          </div>
        </div>
        <div style="text-align: center; width: 140px;">
          <div style="border-top: 1px solid #000; padding-top: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase;">
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  `;

  const fullHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${receipt.receipt_no}</title>
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            background: #f1f5f9;
          }
          
          .print-wrapper {
            display: flex;
            width: 297mm;
            height: 210mm;
            background: white;
            overflow: hidden;
            box-sizing: border-box;
          }
          
          .receipt-copy {
            width: 50%;
            height: 100%;
            padding: 8mm;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
          }
          
          .divider {
            position: absolute;
            right: 0;
            top: 5mm;
            bottom: 5mm;
            width: 1px;
            border-right: 1px dashed #000;
          }

          @media print {
            body { background: white; margin: 0; padding: 0; }
            @page { 
              size: A4 landscape; 
              margin: 0; 
            }
            .print-wrapper {
              width: 297mm;
              height: 210mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-wrapper">
          <div class="receipt-copy">
            ${generateReceiptHTML('PARENT COPY')}
            <div class="divider"></div>
          </div>
          <div class="receipt-copy">
            ${generateReceiptHTML('OFFICE COPY (RECEPTIONIST)')}
          </div>
        </div>
        <script>
          window.onafterprint = function() { window.close(); };
          setTimeout(function() {
            window.print();
          }, 800);
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(fullHTML);
  printWindow.document.close();
};
