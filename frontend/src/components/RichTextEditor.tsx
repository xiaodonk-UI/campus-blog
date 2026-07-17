'use client';

/**
 * 校园个人博客系统 - 富文本编辑器组件
 * 功能：文本格式化、插入图片（上传/URL/素材库）、代码块（语法高亮）
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Button, Space, Tooltip, Divider, Modal, Input, Upload, Tabs, message, Select, Radio,
} from 'antd';
import {
  BoldOutlined, ItalicOutlined, UnderlineOutlined, StrikethroughOutlined,
  OrderedListOutlined, UnorderedListOutlined, LinkOutlined,
  AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined,
  UndoOutlined, RedoOutlined, PictureOutlined, CodeOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';  // 代码高亮主题

// ==================== 支持的语言列表 ====================
const CODE_LANGUAGES = [
  { label: 'Python', value: 'python' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Java', value: 'java' },
  { label: 'C++', value: 'cpp' },
  { label: 'C#', value: 'csharp' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'SQL', value: 'sql' },
  { label: 'HTML', value: 'xml' },
  { label: 'CSS', value: 'css' },
  { label: 'JSON', value: 'json' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Shell/Bash', value: 'bash' },
  { label: 'Markdown', value: 'markdown' },
  { label: '纯文本', value: 'plaintext' },
];

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
}

export default function RichTextEditor({ value = '', onChange }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  // ===== 图片弹窗状态 =====
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [activeTab, setActiveTab] = useState('upload');

  // ===== 代码块弹窗状态 =====
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('python');

  // ===== 链接弹窗状态 =====
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkTarget, setLinkTarget] = useState('_blank');

  /**
   * 初始化编辑器内容（仅首次）
   */
  useEffect(() => {
    if (editorRef.current && !initialized && value) {
      editorRef.current.innerHTML = value;
      setInitialized(true);
    }
  }, [value, initialized]);

  /**
   * 内容变化回调
   */
  const handleInput = useCallback(() => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  /**
   * 保存光标位置，用于在弹窗操作后恢复
   */
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      setSavedRange(sel.getRangeAt(0).cloneRange());
    }
  }, []);

  /**
   * 恢复光标位置
   */
  const restoreSelection = useCallback(() => {
    if (savedRange && editorRef.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange);
      editorRef.current.focus();
    }
  }, [savedRange]);

  /**
   * 执行文本格式命令
   */
  const execCmd = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  }, [handleInput]);

  /**
   * 打开链接弹窗，自动获取当前选中的文字
   */
  const openLinkModal = useCallback(() => {
    saveSelection();
    const sel = window.getSelection();
    const selectedText = sel?.toString().trim() || '';
    setLinkText(selectedText);
    setLinkUrl('https://');
    setLinkTarget('_blank');
    setLinkModalOpen(true);
  }, [saveSelection]);

  /**
   * 确认插入链接
   */
  const handleInsertLink = useCallback(() => {
    let url = linkUrl.trim();
    if (!url) { message.warning('请输入链接地址'); return; }
    // 自动修正常见URL书写错误
    if (url.startsWith('http//')) url = url.replace('http//', 'http://');
    if (url.startsWith('https//')) url = url.replace('https//', 'https://');
    // 纯域名自动补https://
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/') && !url.startsWith('#') && !url.startsWith('mailto:')) {
      if (url.includes('.') && !url.includes(' ')) url = 'https://' + url;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/') && !url.startsWith('#') && !url.startsWith('mailto:')) {
      message.warning('请输入有效的链接地址'); return;
    }
    const text = linkText.trim();

    editorRef.current?.focus();
    restoreSelection();

    if (text) {
      // 有链接文字 → 创建 <a> 标签
      const targetAttr = linkTarget === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : '';
      const linkHtml = `<a href="${url}"${targetAttr}>${text}</a>`;
      document.execCommand('insertHTML', false, linkHtml);
    } else {
      // 无文字但有选区 → 用原生 createLink
      document.execCommand('createLink', false, url);
      // 补充 target 属性（createLink 不设 target）
      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        const anchor = sel.anchorNode.parentElement?.closest('a');
        if (anchor) {
          if (linkTarget === '_blank') {
            anchor.setAttribute('target', '_blank');
            anchor.setAttribute('rel', 'noopener noreferrer');
          }
        }
      }
    }

    handleInput();
    setLinkModalOpen(false);
    setLinkUrl('');
    setLinkText('');
  }, [linkUrl, linkText, linkTarget, handleInput, restoreSelection]);

  /**
   * 将图片HTML插入到光标位置
   */
  const insertImageAtCursor = useCallback((imgUrl: string) => {
    editorRef.current?.focus();
    restoreSelection();
    const imgHtml = `<img src="${imgUrl}" alt="文章配图" style="max-width:100%;border-radius:8px;margin:8px 0;" />`;
    document.execCommand('insertHTML', false, imgHtml);
    handleInput();
  }, [handleInput, restoreSelection]);

  /**
   * 确认插入图片（URL方式或上传完成后）
   */
  const handleInsertImage = useCallback(() => {
    const url = imageUrl.trim();
    if (!url) {
      message.warning('请输入图片URL');
      return;
    }
    insertImageAtCursor(url);
    setImageModalOpen(false);
    setImageUrl('');
  }, [imageUrl, insertImageAtCursor]);

  /**
   * 上传配置
   */
  const uploadProps: UploadProps = {
    name: 'file',
    showUploadList: false,
    // 使用FileReader本地转base64，无需后端上传接口
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        insertImageAtCursor(dataUrl);
        setImageModalOpen(false);
      };
      reader.readAsDataURL(file);
      return false;  // 阻止默认上传
    },
  };

  /**
   * 确认插入代码块
   */
  const handleInsertCode = useCallback(() => {
    if (!codeContent.trim()) {
      message.warning('请输入代码内容');
      return;
    }
    editorRef.current?.focus();
    restoreSelection();

    // 用highlight.js做语法高亮
    let highlighted: string;
    try {
      if (codeLanguage === 'plaintext') {
        highlighted = hljs.highlightAuto(codeContent).value;
      } else {
        highlighted = hljs.highlight(codeContent, { language: codeLanguage, ignoreIllegals: true }).value;
      }
    } catch {
      highlighted = hljs.highlightAuto(codeContent).value;
    }

    const langLabel = CODE_LANGUAGES.find(l => l.value === codeLanguage)?.label || codeLanguage;
    const codeBlockHtml = `
      <div class="code-block-wrapper" style="margin:12px 0;border-radius:8px;overflow:hidden;border:1px solid #e8e8e8;">
        <div class="code-block-header" style="display:flex;justify-content:space-between;align-items:center;padding:6px 12px;background:#f5f5f5;font-size:12px;color:#666;">
          <span>${langLabel}</span>
          <span style="cursor:pointer;user-select:none;" contenteditable="false">📋 复制</span>
        </div>
        <pre style="margin:0;padding:12px;background:#f8f8f8;overflow-x:auto;font-size:13px;line-height:1.6;"><code class="language-${codeLanguage}">${highlighted}</code></pre>
      </div>
    `.trim();

    document.execCommand('insertHTML', false, codeBlockHtml);
    handleInput();
    setCodeModalOpen(false);
    setCodeContent('');
    setCodeLanguage('python');
  }, [codeContent, codeLanguage, handleInput, restoreSelection]);

  // ===== 工具栏按钮 =====
  const toolbarGroups = [
    [
      { icon: <UndoOutlined />, cmd: 'undo', tip: '撤销' },
      { icon: <RedoOutlined />, cmd: 'redo', tip: '重做' },
    ],
    [
      { icon: <BoldOutlined />, cmd: 'bold', tip: '加粗' },
      { icon: <ItalicOutlined />, cmd: 'italic', tip: '斜体' },
      { icon: <UnderlineOutlined />, cmd: 'underline', tip: '下划线' },
      { icon: <StrikethroughOutlined />, cmd: 'strikeThrough', tip: '删除线' },
    ],
    [
      { icon: <AlignLeftOutlined />, cmd: 'justifyLeft', tip: '左对齐' },
      { icon: <AlignCenterOutlined />, cmd: 'justifyCenter', tip: '居中' },
      { icon: <AlignRightOutlined />, cmd: 'justifyRight', tip: '右对齐' },
    ],
    [
      { icon: <UnorderedListOutlined />, cmd: 'insertUnorderedList', tip: '无序列表' },
      { icon: <OrderedListOutlined />, cmd: 'insertOrderedList', tip: '有序列表' },
    ],
    [
      { icon: <LinkOutlined />, action: openLinkModal, tip: '插入链接' },
      {
        icon: <PictureOutlined />,
        action: () => { saveSelection(); setImageModalOpen(true); setActiveTab('upload'); setImageUrl(''); },
        tip: '插入图片',
      },
      {
        icon: <CodeOutlined />,
        action: () => { saveSelection(); setCodeModalOpen(true); setCodeContent(''); setCodeLanguage('python'); },
        tip: '插入代码块',
      },
    ],
  ];

  return (
    <>
      {/* ===== 工具栏 ===== */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2,
        padding: '6px 8px', background: '#fafafa', borderBottom: '1px solid #d9d9d9',
      }}>
        {toolbarGroups.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <Divider type="vertical" style={{ margin: '0 4px' }} />}
            <Space size={2}>
              {group.map((btn, bi) => (
                <Tooltip key={bi} title={btn.tip}>
                  <Button
                    type="text"
                    size="small"
                    icon={btn.icon}
                    onClick={() => {
                      const b = btn as any;
                      if (b.action) b.action();
                      else execCmd(b.cmd!, b.cmdValue);
                    }}
                    style={{ border: 'none', boxShadow: 'none' }}
                  />
                </Tooltip>
              ))}
            </Space>
          </React.Fragment>
        ))}
      </div>

      {/* ===== 编辑区域 ===== */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        style={{
          minHeight: 400, maxHeight: 800, overflowY: 'auto',
          padding: '16px', outline: 'none', fontSize: 15, lineHeight: 1.8, color: '#333',
        }}
        data-placeholder="在这里写下你的文章内容..."
      />

      {/* ===== 插入图片弹窗 ===== */}
      <Modal
        title="插入图片"
        open={imageModalOpen}
        onCancel={() => setImageModalOpen(false)}
        footer={null}
        width={520}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}
          items={[
            {
              key: 'upload',
              label: '本地上传',
              children: (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Upload.Dragger {...uploadProps} accept="image/*">
                    <p style={{ fontSize: 40 }}>📁</p>
                    <p>点击或拖拽图片到此区域上传</p>
                    <p style={{ color: '#999', fontSize: 12 }}>支持 JPG、PNG、GIF，最大 5MB</p>
                  </Upload.Dragger>
                </div>
              ),
            },
            {
              key: 'url',
              label: '网络图片',
              children: (
                <div style={{ padding: '16px 0' }}>
                  <Input
                    placeholder="粘贴图片URL地址，如 https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    onPressEnter={handleInsertImage}
                    size="large"
                  />
                  <div style={{ marginTop: 12, textAlign: 'right' }}>
                    <Button type="primary" onClick={handleInsertImage}>插入图片</Button>
                  </div>
                </div>
              ),
            },
            {
              key: 'library',
              label: '素材库',
              children: (
                <div style={{ padding: '16px 0', textAlign: 'center', color: '#999' }}>
                  <p style={{ fontSize: 40 }}>🖼️</p>
                  <p>素材库功能开发中</p>
                  <p style={{ fontSize: 12 }}>后续支持从已上传图片中选取</p>
                </div>
              ),
            },
          ]}
        />
      </Modal>

      {/* ===== 插入代码块弹窗 ===== */}
      <Modal
        title="插入代码块"
        open={codeModalOpen}
        onCancel={() => setCodeModalOpen(false)}
        onOk={handleInsertCode}
        okText="插入代码"
        width={700}
      >
        <div style={{ marginBottom: 12 }}>
          <span style={{ marginRight: 8 }}>编程语言：</span>
          <Select
            value={codeLanguage}
            onChange={setCodeLanguage}
            options={CODE_LANGUAGES}
            style={{ width: 200 }}
            showSearch
          />
        </div>
        <Input.TextArea
          value={codeContent}
          onChange={(e) => setCodeContent(e.target.value)}
          rows={12}
          placeholder="在此粘贴代码..."
          style={{ fontFamily: 'Consolas, Monaco, monospace', fontSize: 13 }}
        />
      </Modal>

      {/* ===== 插入链接弹窗 ===== */}
      <Modal
        title="插入链接"
        open={linkModalOpen}
        onCancel={() => setLinkModalOpen(false)}
        onOk={handleInsertLink}
        okText="确认插入"
        width={500}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 链接文字 */}
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>链接文字</div>
            <Input
              placeholder="输入链接显示的文字（为空则对选中的文字/图片创建链接）"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
            />
          </div>

          {/* 链接地址 */}
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>链接地址</div>
            <Input
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onPressEnter={handleInsertLink}
            />
          </div>

          {/* 打开方式 */}
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>打开方式</div>
            <Radio.Group value={linkTarget} onChange={(e) => setLinkTarget(e.target.value)}>
              <Radio.Button value="_blank">新标签页打开</Radio.Button>
              <Radio.Button value="_self">当前页面打开</Radio.Button>
            </Radio.Group>
          </div>
        </div>
      </Modal>

      {/* 编辑器placeholder + 代码块复制脚本 */}
      <style jsx global>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #bfbfbf;
          pointer-events: none;
        }
        /* 代码块样式 */
        .code-block-wrapper:hover .code-block-header span:last-child {
          color: #1677ff;
        }
      `}</style>
    </>
  );
}