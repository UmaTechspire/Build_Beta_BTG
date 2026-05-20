/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input } from 'reactstrap';
import { GetClaimHistory, SaveHodDiscussion, SaveApplicantReply, SaveHodGmDiscussion, GetHodGmHistory, SaveGmDirectorDiscussion, GetGmDirectorHistory } from "common/data/mastersapi";
import Swal from 'sweetalert2';

const DiscussionHistoryModal = ({ isOpen, toggle, claimId, currentUser, mode, senderRole, onSuccess }) => {
    // mode: 'HOD', 'APPLICANT', 'HOD_GM', 'GM_DIRECTOR', 'DIRECTOR_CEO'
    // currentUser: { username: string, ... }
    // senderRole: 'HOD', 'GM', 'Director' (optional, used for hierarchical logic)

    const [historyText, setHistoryText] = useState("");
    const [reply, setReply] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && claimId) {
            fetchHistory();
        }
    }, [isOpen, claimId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            let apiCall;
            if (mode === 'HOD_GM') apiCall = GetHodGmHistory;
            else if (mode === 'GM_DIRECTOR') apiCall = GetGmDirectorHistory;
            else if (mode === 'DIRECTOR_CEO') apiCall = GetCommissionerHistory;
            else apiCall = GetClaimHistory;

            const res = await apiCall(claimId);
            if (res.status) {
                setHistoryText(res.data);
            } else {
                setHistoryText("");
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleSend = async () => {
        if (!reply.trim()) {
            Swal.fire("Warning", "Please enter a message.", "warning");
            return;
        }

        const username = currentUser?.username || currentUser?.FullName || "User";
        let payload;
        let apiCall;

        if (mode === 'HOD_GM') {
            payload = { claim_id: claimId, comment: reply, user_name: username, sender_role: senderRole };
            apiCall = SaveHodGmDiscussion;
        } else if (mode === 'GM_DIRECTOR') {
            payload = { claim_id: claimId, comment: reply, user_name: username, sender_role: senderRole };
            apiCall = SaveGmDirectorDiscussion;
        } else if (mode === 'DIRECTOR_CEO') {
            payload = { claim_id: claimId, comment: reply, user_name: username, sender_role: senderRole };
            apiCall = SaveCommissionerDiscussion;
        } else if (mode === 'HOD') {
            payload = { claim_id: claimId, comment: reply, hod_name: username };
            apiCall = SaveHodDiscussion;
        } else {
            // APPLICANT
            payload = { claim_id: claimId, reply: reply, applicant_name: username };
            apiCall = SaveApplicantReply;
        }

        try {
            const res = await apiCall(payload);
            if (res.status || res.success) {
                // Try to get claimno from res or fallback to claimId
                let claimNo = res.claimno || res.claim_no || res.ClaimNo || res.claimNo || claimId;
                if (res.is_delete_required) {
                    await Swal.fire({
                        title: "Warning",
                        text: "This transaction will be cancelled,since,its your 3 rd discussuion",
                        icon: "warning",
                        confirmButtonText: "OK",
                        allowOutsideClick: false
                    });
                } else {
                    await Swal.fire("Success", "Message sent.", "success");
                }
                setReply("");
                fetchHistory(); // Refresh history
                if (onSuccess) onSuccess();
                toggle();
            } else {
                Swal.fire("Error", res.message || "Failed to send message.", "error");
            }
        } catch (error) {
            console.error(error);
            Swal.fire("Error", "An unexpected error occurred.", "error");
        }
    };

    return (
        <Modal isOpen={isOpen} toggle={toggle} size="lg" centered>
            <ModalHeader toggle={toggle}>Discussion Chat</ModalHeader>
            <ModalBody style={{ maxHeight: '60vh', overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
                <div className="history-container p-3">
                    {loading ? (
                        <div className="text-center">Loading...</div>
                    ) : (
                        (() => {
                            const parseHistoryText = (text) => {
                                if (!text) return [];
                                const lines = text.split('\n');
                                const messages = [];
                                const regex = /^\[(.*?)\sat\s(.*?)\]:\s(.*)$/;

                                lines.forEach((line) => {
                                    const match = line.match(regex);
                                    if (match) {
                                        messages.push({
                                            senderName: match[1],
                                            timestamp: match[2],
                                            messageContent: match[3]
                                        });
                                    } else {
                                        if (messages.length > 0) {
                                            messages[messages.length - 1].messageContent += '\n' + line;
                                        } else if (line.trim() !== "") {
                                            messages.push({
                                                senderName: "Unknown",
                                                timestamp: "",
                                                messageContent: line
                                            });
                                        }
                                    }
                                });
                                return messages;
                            };

                            return parseHistoryText(historyText).map((msg, index) => {
                                const { senderName, timestamp, messageContent } = msg;
                                let isMe = false;

                                const currentUserName = currentUser?.username || currentUser?.FullName;
                                if (currentUserName && senderName.toLowerCase() === currentUserName.toLowerCase()) {
                                    isMe = true;
                                }

                                return (
                                    <div key={index} className={`d-flex ${isMe ? 'justify-content-end' : 'justify-content-start'} mb-3`}>
                                        <div
                                            className="p-3 shadow-sm"
                                            style={{
                                                maxWidth: '75%',
                                                borderRadius: '15px',
                                                backgroundColor: isMe ? '#5b73e8' : '#ffffff',
                                                color: isMe ? '#ffffff' : '#000000',
                                                borderBottomRightRadius: isMe ? '0' : '15px',
                                                borderBottomLeftRadius: !isMe ? '0' : '15px'
                                            }}
                                        >
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <small className="fw-bold me-3" style={{ opacity: 0.9 }}>{senderName}</small>
                                                {timestamp && <small style={{ fontSize: '0.75rem', opacity: 0.8 }}>{timestamp}</small>}
                                            </div>
                                            <p className="mb-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
                                                {messageContent}
                                            </p>
                                        </div>
                                    </div>
                                );
                            });
                        })()
                    )}
                    {(!historyText && !loading) && <div className="text-center text-muted">No discussion history yet.</div>}
                </div>

                <div className="mt-4">
                    <label className="form-label fw-bold">Your Reply:</label>
                    <Input
                        type="textarea"
                        rows="3"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Type your message here..."
                        style={{ borderRadius: '8px' }}
                    />
                </div>
            </ModalBody>
            <ModalFooter>
                <Button color="primary" onClick={handleSend} style={{ backgroundColor: '#5b73e8', border: 'none' }}>
                    <i className="mdi mdi-send me-1"></i> Send Reply
                </Button>
                <Button color="secondary" onClick={toggle} outline>Cancel</Button>
            </ModalFooter>
        </Modal>
    );
};

export default DiscussionHistoryModal;
