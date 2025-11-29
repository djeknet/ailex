import { useEffect } from 'react';
import { ChatMessage, MessageAttachment } from '@shared/types/database';
import { Response } from '@/components/ai-elements/response';
import type { ExportType } from '@shared/utils/pdfExport';

interface PDFChatRendererProps {
  messages: ChatMessage[];
  exportType: ExportType;
  onRenderComplete?: () => void;
}

export default function PDFChatRenderer({ messages, exportType, onRenderComplete }: PDFChatRendererProps) {
  useEffect(() => {
    // Вызываем callback после рендеринга
    if (onRenderComplete) {
      setTimeout(onRenderComplete, 100);
    }
  }, [onRenderComplete]);

  return (
    <div className="pdf-chat-content" style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#ffffff',
      color: '#1f2937',
      padding: '20px',
      maxWidth: '800px'
    }}>
      {/* Заголовок */}
      <div style={{
        marginBottom: '30px',
        paddingBottom: '10px',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          margin: '0 0 5px 0',
          color: '#1f2937'
        }}>
          Chat Export
        </h1>
        <p style={{ 
          fontSize: '12px', 
          color: '#6b7280',
          margin: 0
        }}>
          {new Date().toLocaleString()}
          {exportType === 'ai-only' && ' • AI Responses Only'}
        </p>
      </div>

      {/* Сообщения */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {messages.map((message, index) => (
          <div key={message.id || index}>
            {message.isUser ? (
              <PDFUserMessage message={message} />
            ) : (
              <PDFAIMessage message={message} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Компонент для сообщений пользователя
function PDFUserMessage({ message }: { message: ChatMessage }) {
  const attachments = getAttachments(message);
  const imageAttachments = attachments.filter(a => a.type === 'image');
  const fileAttachments = attachments.filter(a => a.type === 'file');
  const domAttachments = attachments.filter(a => a.type === 'dom');
  const tabAttachments = attachments.filter(a => a.type === 'tab');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      {/* Page context badge */}
      {message.pageContextEnabled && message.pageTitle && (
        <div style={{
          fontSize: '11px',
          color: '#6b7280',
          marginBottom: '5px',
          padding: '3px 8px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          border: '1px solid #e5e7eb'
        }}>
          📄 {message.pageTitle}
        </div>
      )}

      {/* Основное сообщение */}
      <div style={{
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        padding: '12px 16px',
        maxWidth: '80%',
        wordBreak: 'break-word'
      }}>
        {/* Action label */}
        {message.actionLabel && (
          <div style={{
            fontSize: '12px',
            fontWeight: '500',
            color: '#16a34a',
            marginBottom: '5px'
          }}>
            {message.actionLabel}
          </div>
        )}

        {/* Quoted text */}
        {message.quotedText && (
          <div style={{
            fontSize: '13px',
            color: '#6b7280',
            fontStyle: 'italic',
            padding: '8px',
            backgroundColor: '#ffffff',
            borderLeft: '3px solid #d1d5db',
            marginBottom: '8px',
            borderRadius: '4px'
          }}>
            {message.quotedText}
          </div>
        )}

        {/* Images */}
        {imageAttachments.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            {imageAttachments.map((img, idx) => (
              <img
                key={idx}
                src={`data:${img.mimeType || 'image/png'};base64,${img.data}`}
                alt={img.name || `Image ${idx + 1}`}
                style={{
                  maxWidth: '100%',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb',
                  marginBottom: '5px'
                }}
              />
            ))}
          </div>
        )}

        {/* File attachments */}
        {fileAttachments.length > 0 && fileAttachments.map((file, idx) => (
          <span key={`file-${idx}`} style={{
            display: 'inline-block',
            fontSize: '11px',
            padding: '2px 6px',
            backgroundColor: '#e0e7ff',
            color: '#3730a3',
            borderRadius: '3px',
            marginRight: '4px',
            marginBottom: '4px'
          }}>
            📎 {file.name}
          </span>
        ))}

        {/* DOM attachments */}
        {domAttachments.length > 0 && domAttachments.map((dom, idx) => (
          <span key={`dom-${idx}`} style={{
            display: 'inline-block',
            fontSize: '11px',
            padding: '2px 6px',
            backgroundColor: '#dbeafe',
            color: '#1e40af',
            borderRadius: '3px',
            marginRight: '4px',
            marginBottom: '4px'
          }}>
            🎯 {dom.name}
          </span>
        ))}

        {/* Tab attachments */}
        {tabAttachments.length > 0 && tabAttachments.map((tab, idx) => (
          <span key={`tab-${idx}`} style={{
            display: 'inline-block',
            fontSize: '11px',
            padding: '2px 6px',
            backgroundColor: '#fef3c7',
            color: '#92400e',
            borderRadius: '3px',
            marginRight: '4px',
            marginBottom: '4px'
          }}>
            🗂️ {tab.tabTitle || tab.name}
          </span>
        ))}

        {/* Message text */}
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <Response>{message.text}</Response>
        </div>
      </div>
    </div>
  );
}

// Компонент для сообщений AI
function PDFAIMessage({ message }: { message: ChatMessage }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      {/* Model badge */}
      {message.operator && message.model && (
        <div style={{
          fontSize: '11px',
          color: '#6b7280',
          marginBottom: '5px',
          padding: '3px 8px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          border: '1px solid #e5e7eb'
        }}>
          🤖 {message.operator} • {message.model}
        </div>
      )}

      {/* Tool executions */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div style={{ marginBottom: '10px', width: '100%' }}>
          {message.toolCalls.map((tool, idx) => (
            <div key={idx} style={{
              padding: '8px 12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              marginBottom: '8px',
              fontSize: '13px'
            }}>
              <div style={{ fontWeight: '500', color: '#15803d', marginBottom: '4px' }}>
                🔧 {tool.name}
              </div>
              {tool.result && (
                <div style={{ color: '#166534', fontSize: '12px' }}>
                  {typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result, null, 2)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reasoning */}
      {message.reasoningContent && (
        <div style={{
          marginBottom: '10px',
          padding: '10px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fde047',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#713f12',
          width: '100%'
        }}>
          <div style={{ fontWeight: '500', marginBottom: '5px' }}>
            🧠 Reasoning
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {message.reasoningContent}
          </div>
        </div>
      )}

      {/* Main response */}
      <div style={{
        backgroundColor: 'transparent',
        borderRadius: '8px',
        padding: '12px 0',
        maxWidth: '100%',
        wordBreak: 'break-word',
        fontSize: '14px',
        lineHeight: '1.6'
      }}>
        <Response>{message.text}</Response>
      </div>

      {/* Generated images */}
      {message.generatedImages && (() => {
        try {
          const images = JSON.parse(message.generatedImages);
          return (
            <div style={{ marginTop: '10px' }}>
              {images.map((img: any, idx: number) => (
                <img
                  key={idx}
                  src={img.url || `data:image/png;base64,${img.b64_json}`}
                  alt={img.revised_prompt || 'Generated image'}
                  style={{
                    maxWidth: '100%',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    marginBottom: '10px'
                  }}
                />
              ))}
            </div>
          );
        } catch {
          return null;
        }
      })()}

      {/* Citations */}
      {message.citations && message.citations.length > 0 && (
        <div style={{
          marginTop: '10px',
          fontSize: '12px',
          color: '#6b7280',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '8px'
        }}>
          <div style={{ fontWeight: '500', marginBottom: '5px' }}>Sources:</div>
          {message.citations.map((citation, idx) => (
            <div key={idx} style={{ marginBottom: '3px' }}>
              [{idx + 1}] {citation.title} - {citation.url}
            </div>
          ))}
        </div>
      )}

      {/* Suggested questions */}
      {message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          fontSize: '12px',
          width: '100%'
        }}>
          <div style={{ fontWeight: '500', marginBottom: '5px', color: '#374151' }}>
            💡 Suggested questions:
          </div>
          {message.suggestedQuestions.map((q, idx) => (
            <div key={idx} style={{ 
              marginBottom: '3px',
              paddingLeft: '10px',
              color: '#6b7280'
            }}>
              • {q}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Вспомогательная функция для получения attachments
function getAttachments(message: ChatMessage): MessageAttachment[] {
  if (message.attachments) {
    try {
      return JSON.parse(message.attachments);
    } catch (error) {
      console.error('Failed to parse attachments:', error);
    }
  }
  // Fallback to old format
  if (message.attach_type && message.attach_name) {
    return [{
      type: message.attach_type,
      name: message.attach_name,
      data: message.file_data || '',
      xpath: message.xpath
    }];
  }
  return [];
}

