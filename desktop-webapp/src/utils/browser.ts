export async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export async function shareLink(title: string, url: string) {
  if (navigator.share) {
    await navigator.share({ title, url });
    return 'shared' as const;
  }
  await copyText(url);
  return 'copied' as const;
}
