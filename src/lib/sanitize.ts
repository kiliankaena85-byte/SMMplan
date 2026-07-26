import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = ['b', 'i', 'u', 'em', 'strong', 'br', 'p', 'ul', 'ol', 'li'];

export function sanitizeServiceDescription(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},          // no attributes allowed (href/style/on* removed)
    disallowedTagsMode: 'discard',  // <script>...</script> discarded completely along with content
  }).trim();
}
