import { EmailBlock, EmailEditorState, GlobalStyles } from './types';

export function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateEmailHtml(state: EmailEditorState): string {
  const { blocks, globalStyles } = state;
  
  const css = generateEmailCSS(globalStyles);
  
  const blocksHtml = blocks.map(block => renderBlockToHtml(block, globalStyles)).join('\n');
  
  return `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    ${css}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${globalStyles.backgroundColor}; font-family: ${globalStyles.fontFamily};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width: ${globalStyles.maxWidth}; width: 100%;">
          <tr>
            <td style="padding: ${globalStyles.padding};">
              ${blocksHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function generateEmailCSS(globalStyles: GlobalStyles): string {
  return `
    /* Reset styles */
    body, table, td, p, a, li, blockquote { 
      -webkit-text-size-adjust: 100%; 
      -ms-text-size-adjust: 100%; 
    }
    
    table, td { 
      mso-table-lspace: 0pt; 
      mso-table-rspace: 0pt; 
    }
    
    img { 
      -ms-interpolation-mode: bicubic; 
      border: 0;
      outline: none;
      text-decoration: none;
    }
    
    /* Global styles */
    .email-container {
      max-width: ${globalStyles.maxWidth};
      margin: 0 auto;
      font-family: ${globalStyles.fontFamily};
      color: ${globalStyles.textColor};
    }
    
    .block {
      margin: 0;
    }
    
    .text-block {
      font-size: 16px;
      line-height: 1.6;
      color: ${globalStyles.textColor};
    }
    
    .text-block a {
      color: ${globalStyles.linkColor};
      text-decoration: underline;
    }
    
    .button-block {
      display: inline-block;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
    }
    
    .button-primary {
      background-color: ${globalStyles.primaryColor};
      color: #ffffff;
    }
    
    .button-secondary {
      background-color: #6b7280;
      color: #ffffff;
    }
    
    .button-outline {
      background-color: transparent;
      color: ${globalStyles.primaryColor};
      border: 2px solid ${globalStyles.primaryColor};
    }
    
    .divider {
      border: none;
      height: 1px;
      margin: 20px 0;
    }
    
    .spacer {
      font-size: 1px;
      line-height: 1px;
      mso-line-height-rule: exactly;
    }
    
    .social-icons {
      text-align: center;
    }
    
    .social-icons a {
      display: inline-block;
      margin: 0 8px;
      text-decoration: none;
    }
    
    .social-icons img {
      width: 32px;
      height: 32px;
    }
    
    .columns {
      width: 100%;
    }
    
    .column {
      vertical-align: top;
    }
    
    /* Mobile responsive */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      
      .column {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box;
      }
      
      .button-block {
        display: block !important;
        width: auto !important;
      }
    }
  `;
}

export function renderBlockToHtml(block: EmailBlock, globalStyles: GlobalStyles): string {
  const { type, content, styles } = block;
  
  const blockStyles = {
    ...styles,
    paddingTop: styles.paddingTop || '12px',
    paddingBottom: styles.paddingBottom || '12px',
    paddingLeft: styles.paddingLeft || '0',
    paddingRight: styles.paddingRight || '0',
  };
  
  const styleString = Object.entries(blockStyles)
    .map(([key, value]) => `${camelToKebab(key)}: ${value}`)
    .join('; ');
  
  switch (type) {
    case 'text':
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td class="text-block" style="${styleString}">
              ${content}
            </td>
          </tr>
        </table>
      `;
      
    case 'image':
      const imageHtml = content.href 
        ? `<a href="${content.href}"><img src="${content.src}" alt="${content.alt}" style="max-width: 100%; height: auto;"></a>`
        : `<img src="${content.src}" alt="${content.alt}" style="max-width: 100%; height: auto;">`;
      
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="${styles.textAlign || 'center'}" style="${styleString}">
              ${imageHtml}
            </td>
          </tr>
        </table>
      `;
      
    case 'button':
      const buttonClass = `button-block button-${content.style || 'primary'}`;
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="${styles.textAlign || 'center'}" style="${styleString}">
              <a href="${content.href}" class="${buttonClass}" style="padding: 12px 24px; ${styleString}">
                ${content.text}
              </a>
            </td>
          </tr>
        </table>
      `;
      
    case 'divider':
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="${styleString}">
              <hr class="divider" style="background-color: ${content.color}; height: ${content.thickness}px;">
            </td>
          </tr>
        </table>
      `;
      
    case 'spacer':
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td class="spacer" style="height: ${content.height}px; font-size: 1px; line-height: 1px;">
              &nbsp;
            </td>
          </tr>
        </table>
      `;
      
    case 'columns':
      const columnWidth = content.layout === '2-column' ? '50%' : 
                          content.layout === '3-column' ? '33.33%' : '25%';
      
      const columnsHtml = content.columns.map((column: any) => `
        <td class="column" style="width: ${columnWidth}; vertical-align: top; padding: 0 10px;">
          ${column.content}
        </td>
      `).join('');
      
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="${styleString}">
          <tr>
            ${columnsHtml}
          </tr>
        </table>
      `;
      
    case 'social':
      const socialIcons = content.platforms.map((platform: any) => {
        if (!platform.url) return '';
        return `
          <a href="${platform.url}" style="margin: 0 8px;">
            <img src="/icons/${platform.icon}.png" alt="${platform.name}" width="${content.iconSize || 32}" height="${content.iconSize || 32}">
          </a>
        `;
      }).join('');
      
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td class="social-icons" align="center" style="${styleString}">
              ${socialIcons}
            </td>
          </tr>
        </table>
      `;
      
    case 'video':
      const videoHtml = content.thumbnailUrl ? `
        <a href="${content.videoUrl}">
          <img src="${content.thumbnailUrl}" alt="${content.title}" style="max-width: 100%; height: auto;">
          <div style="text-align: center; margin-top: 10px;">
            <strong>${content.title}</strong>
            ${content.description ? `<br><span style="color: #666;">${content.description}</span>` : ''}
          </div>
        </a>
      ` : `
        <a href="${content.videoUrl}" style="color: ${globalStyles.linkColor};">
          ${content.title}
        </a>
      `;
      
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="${styleString}">
              ${videoHtml}
            </td>
          </tr>
        </table>
      `;
      
    default:
      return '';
  }
}

export function generatePlainTextFromBlocks(blocks: EmailBlock[]): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'text':
        return stripHtml(block.content);
      case 'image':
        return block.content.alt || '[Image]';
      case 'button':
        return `${block.content.text}: ${block.content.href}`;
      case 'divider':
        return '---';
      case 'spacer':
        return '';
      case 'video':
        return `${block.content.title}: ${block.content.videoUrl}`;
      case 'social':
        return block.content.platforms
          .filter((p: any) => p.url)
          .map((p: any) => `${p.name}: ${p.url}`)
          .join('\n');
      case 'columns':
        return block.content.columns
          .map((col: any) => stripHtml(col.content))
          .join(' | ');
      default:
        return '';
    }
  }).filter(Boolean).join('\n\n');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

export function validateEmailContent(state: EmailEditorState): string[] {
  const errors: string[] = [];
  
  if (state.blocks.length === 0) {
    errors.push('Email must contain at least one block');
  }
  
  state.blocks.forEach((block, index) => {
    switch (block.type) {
      case 'text':
        if (!block.content || block.content.trim() === '') {
          errors.push(`Text block ${index + 1} is empty`);
        }
        break;
      case 'image':
        if (!block.content.src) {
          errors.push(`Image block ${index + 1} is missing image source`);
        }
        break;
      case 'button':
        if (!block.content.text) {
          errors.push(`Button block ${index + 1} is missing button text`);
        }
        if (!block.content.href) {
          errors.push(`Button block ${index + 1} is missing link URL`);
        }
        break;
      case 'video':
        if (!block.content.videoUrl) {
          errors.push(`Video block ${index + 1} is missing video URL`);
        }
        break;
    }
  });
  
  return errors;
}

export function optimizeEmailForDeliverability(state: EmailEditorState): string[] {
  const warnings: string[] = [];
  
  // Check text-to-image ratio
  const textBlocks = state.blocks.filter(b => b.type === 'text');
  const imageBlocks = state.blocks.filter(b => b.type === 'image');
  
  if (imageBlocks.length > textBlocks.length) {
    warnings.push('Consider adding more text content to improve deliverability');
  }
  
  // Check for spam words in text content
  const spamWords = ['free', 'urgent', 'limited time', 'act now', 'guarantee'];
  const textContent = textBlocks.map(b => stripHtml(b.content)).join(' ').toLowerCase();
  
  spamWords.forEach(word => {
    if (textContent.includes(word)) {
      warnings.push(`Consider avoiding spam trigger word: "${word}"`);
    }
  });
  
  // Check link count
  const linkCount = state.blocks.reduce((count, block) => {
    if (block.type === 'button') return count + 1;
    if (block.type === 'text') {
      const linkMatches = block.content.match(/<a[^>]*>/g);
      return count + (linkMatches ? linkMatches.length : 0);
    }
    return count;
  }, 0);
  
  if (linkCount > 5) {
    warnings.push('Too many links may affect deliverability');
  }
  
  return warnings;
}