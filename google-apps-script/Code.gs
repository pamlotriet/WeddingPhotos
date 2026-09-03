const FOLDER_ID = '1CzdQMdU02vxnd8pY60eCOX3nhO8Fq-WG';

function doPost(request) {
  const payload = JSON.parse(request.postData.contents);
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const guestName = String(payload.guestName || 'Guest')
    .trim()
    .slice(0, 80);

  (payload.files || []).forEach((photo) => {
    const bytes = Utilities.base64Decode(photo.data);
    const blob = Utilities.newBlob(bytes, photo.type || 'image/jpeg', photo.name || 'photo.jpg');
    folder.createFile(blob).setDescription('Uploaded by ' + guestName);
  });

  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
    ContentService.MimeType.JSON,
  );
}
