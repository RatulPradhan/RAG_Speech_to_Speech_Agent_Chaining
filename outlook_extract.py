import imaplib
import email
from datetime import datetime, timedelta

# 1. Connect & authenticate against Outlook.com’s IMAP server
IMAP_HOST = "imap-mail.outlook.com"   # for Outlook.com/Hotmail/Live
IMAP_PORT = 993
USERNAME  = "pradra01@gettysburg.edu"         # or @hotmail.com, @live.com
PASSWORD  = "2beratherthanappear2be@"  # generate an app password if you use MFA

imap = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
imap.login(USERNAME, PASSWORD)

# 2. Select the Inbox
imap.select("INBOX")

# 3. Compute the SINCE-date (7 days ago) in the format DD-Mon-YYYY
since = (datetime.now() - timedelta(days=7)).strftime("%d-%b-%Y")

# 4. Search and fetch
status, messages = imap.search(None, f'(SINCE {since})')
if status != "OK":
    raise Exception("IMAP search failed")

for num in messages[0].split():
    status, data = imap.fetch(num, "(RFC822)")
    msg = email.message_from_bytes(data[0][1])
    print(msg["Date"], msg.get("From"), msg.get("Subject"))

imap.logout()
