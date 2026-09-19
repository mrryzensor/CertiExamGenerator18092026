import React, { useState, useEffect } from 'react';
import { api } from '../services/apiService';
import {
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Download,
  Award,
  Calendar,
  User,
  Hash,
  FileCheck,
  ExternalLink,
} from 'lucide-react';

interface PublicVerifyPageProps {
  certificateId: string;
}

export const PublicVerifyPage: React.FC<PublicVerifyPageProps> = ({ certificateId }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [verificationResult, setVerificationResult] = useState<{
    found: boolean;
    certificate?: any;
    message?: string;
  } | null>(null);

  useEffect(() => {
    if (!certificateId) return;

    api
      .verifyCertificate(certificateId)
      .then((res) => {
        setVerificationResult(res);
      })
      .catch(() => {
        setVerificationResult({
          found: false,
          message: 'Error al consultar el servidor de verificación.',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [certificateId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Verification Card */}
      <div className="relative w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl z-10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white tracking-tight">
                CertiExam Oficial
              </h1>
              <p className="text-[11px] text-slate-400">Portal Público de Verificación Digital</p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            QR Seguro
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-400">Validando autenticidad en el registro oficial...</p>
          </div>
        ) : !verificationResult || !verificationResult.found ? (
          /* NOT FOUND */
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-400 mb-1">
              <AlertCircle className="w-8 h-8 text-rose-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Certificado No Encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              El identificador <span className="font-mono text-slate-200">"{certificateId}"</span> no corresponde a ningún certificado registrado en nuestra base de datos oficial.
            </p>
          </div>
        ) : verificationResult.certificate.status === 'revoked' ? (
          /* REVOKED */
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Certificado Revocado
                </span>
                <h3 className="text-sm font-semibold text-white">
                  Este certificado ha sido invalidado oficialmente
                </h3>
                {verificationResult.certificate.revocation_reason && (
                  <p className="text-xs text-rose-300/80 mt-1">
                    Motivo: {verificationResult.certificate.revocation_reason}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-500">ID del Certificado:</span>
                <span className="font-mono text-slate-300 font-bold">{certificateId}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-500">Emitido a:</span>
                <span className="text-slate-200 font-medium">{verificationResult.certificate.recipient_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha Original:</span>
                <span className="text-slate-300">{verificationResult.certificate.issue_date}</span>
              </div>
            </div>
          </div>
        ) : (
          /* VALID / AUTHENTIC */
          <div className="space-y-6 animate-in fade-in">
            {/* Status Banner */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Auténtico y Válido
                </span>
                <h3 className="text-sm font-semibold text-white">
                  Certificado Oficial Verificado
                </h3>
                <p className="text-[11px] text-emerald-300/80">
                  Documento auténtico emitido a través de CertiExam
                </p>
              </div>
            </div>

            {/* Recipient and Event Details */}
            <div className="p-5 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> ID Único Permanente:
                </span>
                <span className="font-mono font-bold text-indigo-400 text-sm">
                  {verificationResult.certificate.id}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Participante:
                </span>
                <span className="font-semibold text-white text-sm">
                  {verificationResult.certificate.recipient_name}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-slate-500">Documento / ID:</span>
                <span className="font-mono text-slate-300 font-medium">
                  {verificationResult.certificate.recipient_identifier}
                </span>
              </div>

              {verificationResult.certificate.event_name && (
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <span className="text-slate-500">Evento / Programa:</span>
                  <span className="text-slate-200 font-medium text-right max-w-xs truncate">
                    {verificationResult.certificate.event_name}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Fecha de Emisión:
                </span>
                <span className="text-slate-300 font-medium">
                  {verificationResult.certificate.issue_date}
                </span>
              </div>
            </div>

            {/* Direct Download Button */}
            <a
              href={`/api/certificates/download/${verificationResult.certificate.id}`}
              download
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Download className="w-4 h-4" />
              Descargar Certificado Oficial en PDF
            </a>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center pt-2 border-t border-slate-800/60">
          <p className="text-[10px] text-slate-600">
            Verificación respaldada criptográficamente con almacenamiento persistente en disco
          </p>
        </div>
      </div>
    </div>
  );
};
