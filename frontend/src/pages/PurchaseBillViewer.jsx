import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/api';
import { API_URL } from '../utils/api';
import { ArrowLeft, Download, Share2, Printer, Edit, Trash2, Mail, Copy, CreditCard, X, CheckCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { getImageUrl, getViewerTaxBreakdown } from './InvoiceViewer';
import ActionDropdown from '../components/ActionDropdown';

const formatCustomerAddress = (addr, flatFallback) => {
    if (!addr) return flatFallback || '';
    if (typeof addr === 'string') return addr;
    const hasValues = Object.values(addr).some(val => val !== undefined && val !== null && String(val).trim() !== '');
    if (!hasValues) return flatFallback || '';
    const streetParts = [addr.street1, addr.street2, addr.street].filter(Boolean).map(s => String(s).trim()).join(', ');
    return [
        streetParts,
        addr.city,
        addr.state,
        addr.zipCode || addr.pincode || addr.zip
    ].filter(v => v && String(v).trim() !== '').join(', ');
};

const PurchaseBillViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [billData, setBillData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailTo, setEmailTo] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('Bank');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentRef, setPaymentRef] = useState('');
    const [recordingPayment, setRecordingPayment] = useState(false);

    const quoteRef = useRef(null);

    const handleDeleteBill = async () => {
        if (window.confirm("Are you sure you want to permanently delete this purchase bill? This will reverse vendor balances and stock.")) {
            try {
                await axios.delete(`/api/purchase-bills/${id}`);
                showToast("Purchase Bill deleted successfully.", "success");
                navigate('/purchase-bills');
            } catch (err) {
                console.error("Error deleting purchase bill", err);
                showToast(err.response?.data?.message || "Failed to delete purchase bill.", "error");
            }
        }
    };

    const fetchBill = async () => {
        try {
            const res = await axios.get(`/api/public/purchase-bills/${id}`);
            setBillData(res.data.data);
            const billBalance = res.data.data?.bill?.balanceDue;
            if (billBalance !== undefined) {
                setPaymentAmount(billBalance);
            }
        } catch (err) {
            console.error("Error fetching purchase bill", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBill();
    }, [id]);

    const handleRecordPaymentSubmit = async (e) => {
        e.preventDefault();
        setRecordingPayment(true);
        try {
            await axios.post(`/api/purchase-bills/${id}/pay`, {
                amount: Number(paymentAmount),
                mode: paymentMode,
                date: paymentDate,
                reference: paymentRef
            });
            showToast('Payment recorded successfully!', 'success');
            setIsPaymentModalOpen(false);
            fetchBill();
        } catch (err) {
            console.error('Error recording payment', err);
            showToast(err.response?.data?.message || 'Failed to record payment', 'error');
        } finally {
            setRecordingPayment(false);
        }
    };

    const handleDownloadPDF = () => {
        setDownloading(true);
        const token = localStorage.getItem('token')
            || (() => { try { return JSON.parse(localStorage.getItem('user'))?.token; } catch { return ''; } })()
            || '';
        window.location.href = `${API_URL}/api/purchase-bills/${id}/download?token=${token}`;
        showToast('PDF download started!', 'success');
        setTimeout(() => {
            setDownloading(false);
        }, 3000);
    };

    const openEmailModal = () => {
        if (!billData) return;
        const { bill, settings } = billData;
        const vendor = bill.vendorId;
        
        setEmailTo(vendor?.email || '');
        setEmailSubject(`Purchase Bill ${bill.billNumber} from ${settings?.companyName || 'Prolync Billing'}`);
        setEmailMessage(`Hello ${vendor?.companyName || vendor?.name || 'Vendor'},\n\nPlease find attached Purchase Bill ${bill.billNumber}.\n\nThank you,\n${settings?.companyName || 'Prolync Billing'}`);
        setIsEmailModalOpen(true);
    };

    const handleSendEmail = async () => {
        if (!emailTo) {
            alert('Recipient email address is required.');
            return;
        }
        setSendingEmail(true);
        try {
            const token = localStorage.getItem('token')
                || (() => { try { return JSON.parse(localStorage.getItem('user'))?.token; } catch { return ''; } })()
                || '';

            await axios.post(`/api/purchase-bills/${id}/send`, {
                to: emailTo,
                subject: emailSubject,
                message: emailMessage
            }, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            showToast('Purchase Bill email sent successfully!', 'success');
            setIsEmailModalOpen(false);
        } catch (err) {
            console.error('Email send failed:', err);
            alert(err.response?.data?.message || 'Failed to send email. Please check your SMTP configuration in backend .env');
        } finally {
            setSendingEmail(false);
        }
    };



    const handleCopyDetails = () => {
        if (!billData) return;
        const { bill } = billData;
        const text = `Purchase Bill: ${bill.billNumber}\nVendor: ${bill.vendorId?.companyName || bill.vendorId?.name || 'Vendor'}\nAmount: ₹${(bill.grandTotal || 0).toFixed(2)}`;
        navigator.clipboard.writeText(text)
            .then(() => {
                showToast('Purchase Bill details copied to clipboard!', 'success');
            })
            .catch(err => {
                console.error('Failed to copy', err);
            });
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Bill Viewer...</div>;
    if (!billData) return <div className="p-8 text-center text-red-500">Purchase Bill not found.</div>;

    const { bill, settings } = billData;
    const vendor = bill.vendorId;

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 gap-6 no-print">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate('/purchase-bills')} className="group p-3 bg-white border border-slate-200 rounded-md text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{bill.billNumber}</h1>
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest uppercase shadow-sm ${bill.status === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>
                                {bill.status}
                            </span>
                            
                            <div className="flex items-center gap-2 ml-2">
                                <button onClick={handleDownloadPDF} disabled={downloading} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 rounded-md font-semibold text-[11px] shadow-sm transition-all disabled:opacity-75">
                                    {downloading ? (
                                        <><div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Downloading...</>
                                    ) : (
                                        <><Download size={12} /> Download</>
                                    )}
                                </button>
                                
                                {['Unpaid', 'Partial', 'Partially Paid', 'Overdue'].includes(bill.status) && (
                                    <button onClick={() => setIsPaymentModalOpen(true)} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded-md text-emerald-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 transition-all shadow-sm font-semibold text-[11px]" title="Record Payment">
                                        <CreditCard size={12} /> Record Payment
                                    </button>
                                )}

                                <button onClick={() => navigate(`/purchase-bills/${bill._id}/edit`)} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded-md text-slate-600 hover:text-[#2f62ff] hover:border-[#2f62ff] hover:bg-slate-50 transition-all shadow-sm font-semibold text-[11px]" title="Edit Purchase Bill">
                                    <Edit size={12} /> Edit
                                </button>
                            </div>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Vendor: <span className="text-slate-900">{vendor?.companyName}</span></p>
                    </div>

                </div>

                <div className="flex items-center gap-2">
                    <ActionDropdown>
                        <button onClick={() => window.print()}>
                            <Printer size={16} /> Print Bill
                        </button>
                        <button onClick={handleCopyDetails}>
                            <Copy size={16} /> Copy Details
                        </button>
                        <button onClick={openEmailModal}>
                            <Mail size={16} /> Send Email
                        </button>
                        <button onClick={handleDeleteBill} className="text-red-600">
                            <Trash2 size={16} /> Delete Bill
                        </button>
                    </ActionDropdown>
                </div>
            </div>

            <div className="flex justify-center">
                <div className="w-full max-w-4xl bg-white p-12 rounded-md shadow-sm border border-slate-200 font-sans text-slate-800" ref={quoteRef}>
                    <div className="flex justify-between items-start border-b border-slate-100 pb-8 mb-8">
                        <div>
                            {settings?.logoUrl ? (
                                <img src={getImageUrl(settings.logoUrl)} alt="Logo" className="h-16 object-contain mb-4" />
                            ) : (
                                <h1 className="text-2xl font-black text-slate-900 mb-2">{settings?.companyName || 'Transport Company'}</h1>
                            )}
                            <p className="text-slate-500 text-sm">{[settings?.address?.street, settings?.address?.city].filter(Boolean).join(', ')}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-4xl font-black text-rose-600 tracking-tight uppercase mb-4">Purchase Bill</h2>
                            <p className="text-slate-500 text-sm mb-1">Bill No: <span className="font-bold text-slate-900">{bill.billNumber}</span></p>
                            <p className="text-slate-500 text-sm mb-1">Date: <span className="font-medium text-slate-900">{new Date(bill.billDate).toLocaleDateString()}</span></p>
                            {bill.dueDate && (
                                <p className="text-slate-500 text-sm mb-1">Due Date: <span className="font-medium text-slate-900">{new Date(bill.dueDate).toLocaleDateString()}</span></p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-10">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Vendor Information</p>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">{vendor?.companyName}</h3>
                            <p className="text-slate-500 text-sm">{formatCustomerAddress(vendor?.billingAddress, vendor?.address)}</p>
                            <p className="text-slate-500 text-sm">GSTIN: {vendor?.gstNumber || 'URD'}</p>
                        </div>
                    </div>

                    <table className="w-full mb-10 text-left">
                        <thead>
                            <tr className="border-b-2 border-slate-800 text-slate-900 text-sm">
                                <th className="py-3 font-bold">Item Description</th>
                                <th className="py-3 font-bold text-center">Qty</th>
                                <th className="py-3 font-bold text-right">Rate</th>
                                <th className="py-3 font-bold text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {bill.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-100">
                                    <td className="py-4 font-medium text-slate-800">{item.name || (item.itemId?.name)}</td>
                                    <td className="py-4 text-center text-slate-600">{item.quantity}</td>
                                    <td className="py-4 text-right text-slate-600">₹{(item.rate || 0).toFixed(2)}</td>
                                    <td className="py-4 text-right font-bold text-slate-900">₹{(item.total ?? item.amount ?? 0).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-end">
                        <div className="w-1/3 space-y-3 text-sm">
                            <div className="flex justify-between text-slate-600">
                                <span>Sub Total</span>
                                <span className="font-medium text-slate-900">₹{(bill.subTotal || 0).toFixed(2)}</span>
                            </div>
                            {getViewerTaxBreakdown(bill).map((row, idx) => (
                                <div key={idx} className="flex justify-between text-slate-600">
                                    <span>{row.label}</span>
                                    <span>₹{(row.amount || 0).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center text-rose-600 font-bold border-t border-slate-200 mt-2 pt-3 text-lg">
                                <span>Grand Total</span>
                                <span>₹{(bill.grandTotal || 0).toFixed(2)}</span>
                            </div>

                            {bill.amountPaid > 0 && (
                                <div className="flex justify-between items-center text-emerald-600 font-medium text-sm mt-1">
                                    <span>Amount Paid</span>
                                    <span>- ₹{(bill.amountPaid || 0).toFixed(2)}</span>
                                </div>
                            )}
                            {bill.balanceDue > 0 && (
                                <div className="flex justify-between items-center text-slate-800 font-bold text-sm mt-1 border-t border-slate-100 pt-1">
                                    <span>Balance Due</span>
                                    <span>₹{(bill.balanceDue || 0).toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {(bill.notes || (bill.includeTerms !== false && bill.termsAndConditions)) && (
                        <div className="mt-10 pt-6 border-t border-slate-100 text-xs text-slate-500">
                            {bill.notes && (
                                <div className="mb-4">
                                    <p className="font-bold text-slate-700 uppercase mb-1">Notes</p>
                                    <p className="text-slate-600 whitespace-pre-wrap">{bill.notes}</p>
                                </div>
                            )}
                            {(bill.includeTerms !== false && bill.termsAndConditions) && (
                                <div>
                                    <p className="font-bold text-slate-700 uppercase mb-1">Terms & Conditions</p>
                                    <p className="text-slate-600 whitespace-pre-wrap">{bill.termsAndConditions}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {bill.includeBankDetails !== false && settings?.bankDetails?.accountNumber && (
                        <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
                            <p className="font-bold text-slate-700 uppercase mb-1">Bank Details</p>
                            <p>Bank: {settings.bankDetails.bankName}</p>
                            <p>Account Name: {settings.bankDetails.accountName}</p>
                            <p>Account Number: {settings.bankDetails.accountNumber}</p>
                            <p>IFSC Code: {settings.bankDetails.ifscCode}</p>
                        </div>
                    )}

                    {bill.includeUpiQr !== false && settings?.upiId && (
                        <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
                            <p className="font-bold text-slate-700 uppercase mb-1">UPI ID</p>
                            <p>{settings.upiId}</p>
                        </div>
                    )}

                    {bill.includeSignature && (
                        <div className="mt-16 flex justify-end">
                            <div className="text-center">
                                <div className="border border-slate-200 rounded-md p-2 w-48 h-20 flex items-center justify-center bg-slate-50 mb-2">
                                    {settings?.signature ? (
                                        <img src={getImageUrl(settings.signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <span className="text-xs text-slate-400">Signature</span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Authorized Signatory</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment History Section */}
            {billData.payments && billData.payments.length > 0 && (
                <div className="w-full max-w-4xl mx-auto mt-8 bg-white p-8 rounded-md shadow-sm border border-slate-200 font-sans">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <CheckCircle size={20} className="text-emerald-500" />
                        Payment History
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500 text-sm">
                                    <th className="py-3 font-semibold">Date</th>
                                    <th className="py-3 font-semibold">Payment #</th>
                                    <th className="py-3 font-semibold">Mode</th>
                                    <th className="py-3 font-semibold">Reference</th>
                                    <th className="py-3 font-semibold text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {billData.payments.map((payment, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                        <td className="py-4 text-slate-700">{new Date(payment.date).toLocaleDateString()}</td>
                                        <td className="py-4 font-medium text-slate-900">{payment.paymentNumber}</td>
                                        <td className="py-4 text-slate-600">{payment.mode || 'N/A'}</td>
                                        <td className="py-4 text-slate-600">{payment.reference || '-'}</td>
                                        <td className="py-4 text-right font-bold text-emerald-600">₹{(payment.amount || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Email Modal */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60  p-4 animate-fade-in no-print">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden transform transition-all scale-100 duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Send Purchase Bill via Email</h3>
                                <p className="text-slate-500 text-xs mt-0.5">Customize details before sending</p>
                            </div>
                            <button
                                onClick={() => setIsEmailModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">To (Recipient Email)</label>
                                <input
                                    type="email"
                                    value={emailTo}
                                    onChange={e => setEmailTo(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 text-sm focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                    placeholder="vendor@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subject</label>
                                <input
                                    type="text"
                                    value={emailSubject}
                                    onChange={e => setEmailSubject(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 text-sm focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Message</label>
                                <textarea
                                    value={emailMessage}
                                    onChange={e => setEmailMessage(e.target.value)}
                                    rows={5}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 text-sm focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none resize-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEmailModalOpen(false)}
                                className="px-5 py-2.5 bg-white border border-slate-200 rounded-md text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendEmail}
                                disabled={sendingEmail}
                                className="px-5 py-2.5 text-white bg-slate-800 rounded-md font-bold text-sm shadow-md transition-all hover:bg-slate-900 disabled:opacity-75 flex items-center gap-2"
                            >
                                {sendingEmail ? (
                                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                                ) : (
                                    'Send Email'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Record Payment Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <CreditCard size={20} className="text-[#2f62ff]" /> Record Payment
                            </h3>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleRecordPaymentSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Amount (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    max={bill.balanceDue}
                                    required
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2f62ff]/20 focus:border-[#2f62ff] outline-none transition-all"
                                    placeholder="Enter amount"
                                />
                                <p className="text-xs text-slate-500 mt-1">Balance Due: ₹{(bill.balanceDue || 0).toFixed(2)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={paymentDate}
                                        onChange={(e) => setPaymentDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2f62ff]/20 focus:border-[#2f62ff] outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Mode</label>
                                    <select
                                        value={paymentMode}
                                        onChange={(e) => setPaymentMode(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2f62ff]/20 focus:border-[#2f62ff] outline-none transition-all"
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="Bank">Bank Transfer</option>
                                        <option value="UPI">UPI / QR</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Credit">Credit</option>
                                        <option value="Card">Card</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Reference Number <span className="text-slate-400 font-normal">(Optional)</span></label>
                                <input
                                    type="text"
                                    value={paymentRef}
                                    onChange={(e) => setPaymentRef(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2f62ff]/20 focus:border-[#2f62ff] outline-none transition-all"
                                    placeholder="Txn ID, Cheque No. etc."
                                />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={recordingPayment} className="flex-1 px-4 py-2.5 bg-[#2f62ff] hover:bg-[#1e50e2] text-white rounded-lg font-semibold transition-colors disabled:opacity-70 flex justify-center items-center">
                                    {recordingPayment ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Record Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseBillViewer;
