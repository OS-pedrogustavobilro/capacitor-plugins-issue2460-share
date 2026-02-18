import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonList
} from '@ionic/react';
import { useState } from 'react';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import './Home.css';

interface ContactData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  organization: string;
  address: string;
  website: string;
}

const Home: React.FC = () => {
  const [contact, setContact] = useState<ContactData>({
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    email: 'john.doe@example.com',
    organization: 'Acme Corp',
    address: '123 Main St;Apt 4;New York;NY;10001;USA',
    website: 'https://example.com'
  });

  const escapeVCard = (text: string | undefined): string => {
    if (!text) return '';

    return text
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  };

  const toAsciiFileName = (s: string): string => {
    return (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
  };

  const generateVCard = (contactData: ContactData): string => {
    const lines: string[] = [];
    lines.push('BEGIN:VCARD');
    lines.push('VERSION:3.0');

    const lastName = escapeVCard(contactData.lastName);
    const firstName = escapeVCard(contactData.firstName);
    lines.push(`N:${lastName};${firstName};;;`);
    lines.push(`FN:${firstName} ${lastName}`.trim());

    if (contactData.organization) {
      lines.push(`ORG:${escapeVCard(contactData.organization)}`);
    }

    if (contactData.phone) {
      lines.push(`TEL;TYPE=CELL:${escapeVCard(contactData.phone)}`);
    }

    if (contactData.email) {
      lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(contactData.email)}`);
    }

    if (contactData.address) {
      const addressParts = contactData.address.split(';');
      const escapedParts = addressParts.map(part => escapeVCard(part));
      lines.push(`ADR;TYPE=HOME:;;${escapedParts.join(';')}`);
    }

    if (contactData.website) {
      lines.push(`URL:${escapeVCard(contactData.website)}`);
    }

    lines.push('END:VCARD');
    return lines.join('\r\n') + '\r\n';
  };

  const shareContact = async (): Promise<void> => {
    try {
      const vcardValue = generateVCard(contact);

      const safeFirst = toAsciiFileName(contact.firstName);
      const safeLast = toAsciiFileName(contact.lastName);
      const fileName = `${safeFirst || 'Contact'}_${safeLast || 'VCard'}.vcf`;

      const dir = Directory.Cache;
      await Filesystem.writeFile({
        path: fileName,
        data: vcardValue,
        directory: dir,
        encoding: Encoding.UTF8,
        recursive: true
      });

      const { uri } = await Filesystem.getUri({
        directory: dir,
        path: fileName
      });

      const statInfo = await Filesystem.stat({
        directory: dir,
        path: fileName
      });

      console.log('=== File Diagnostics ===');
      console.log('File name:', fileName);
      console.log('File URI:', uri);
      console.log('File size:', statInfo.size, 'bytes');
      console.log('File type:', statInfo.type);
      console.log('File mtime:', statInfo.mtime);
      console.log('Directory:', dir);
      console.log('=== vCard Content ===');
      console.log(vcardValue);
      console.log('=== Attempting Share ===');

      await Share.share({
        title: `${contact.firstName} ${contact.lastName}`.trim(),
        dialogTitle: 'Share contact',
        files: [uri]
      });

      console.log('Share completed successfully');
    } catch (error) {
      console.error('=== Share Error ===');
      console.error('Error type:', typeof error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error);
      alert(`Error: ${error}`);
    }
  };

  const shareContactWithText = async (): Promise<void> => {
    try {
      const vcardValue = generateVCard(contact);

      console.log('=== Sharing as text ===');
      console.log('vCard content:', vcardValue);

      await Share.share({
        title: `${contact.firstName} ${contact.lastName}`.trim(),
        text: vcardValue,
        dialogTitle: 'Share contact (as text)'
      });

      console.log('Text share completed successfully');
    } catch (error) {
      console.error('Text share error:', error);
      alert(`Text share error: ${error}`);
    }
  };

  const updateContact = (field: keyof ContactData, value: string) => {
    setContact(prev => ({ ...prev, [field]: value }));
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>vCard Share Issue Reproduction</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Reproduce Issue #2460</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>
              This reproduces the Capacitor Share plugin issue where vCard files
              cannot be shared via Gmail or Slack (they show "invalid file" error).
            </p>
            <p>
              <strong>Steps:</strong>
              <br />1. Fill in the contact details below (or use defaults)
              <br />2. Click "Share vCard"
              <br />3. Try to share via Gmail or Slack
              <br />4. You should see "The files you are trying to attach are invalid" error
            </p>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Contact Information</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              <IonItem>
                <IonLabel position="stacked">First Name</IonLabel>
                <IonInput
                  value={contact.firstName}
                  onIonInput={(e) => updateContact('firstName', e.detail.value || '')}
                  placeholder="Enter first name"
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Last Name</IonLabel>
                <IonInput
                  value={contact.lastName}
                  onIonInput={(e) => updateContact('lastName', e.detail.value || '')}
                  placeholder="Enter last name"
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Phone</IonLabel>
                <IonInput
                  value={contact.phone}
                  onIonInput={(e) => updateContact('phone', e.detail.value || '')}
                  placeholder="Enter phone number"
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Email</IonLabel>
                <IonInput
                  value={contact.email}
                  onIonInput={(e) => updateContact('email', e.detail.value || '')}
                  placeholder="Enter email"
                  type="email"
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Organization</IonLabel>
                <IonInput
                  value={contact.organization}
                  onIonInput={(e) => updateContact('organization', e.detail.value || '')}
                  placeholder="Enter organization"
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Address (semicolon-separated)</IonLabel>
                <IonInput
                  value={contact.address}
                  onIonInput={(e) => updateContact('address', e.detail.value || '')}
                  placeholder="Street;Apt;City;State;Zip;Country"
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Website</IonLabel>
                <IonInput
                  value={contact.website}
                  onIonInput={(e) => updateContact('website', e.detail.value || '')}
                  placeholder="Enter website URL"
                  type="url"
                />
              </IonItem>
            </IonList>

            <IonButton expand="block" onClick={shareContact} style={{ marginTop: '20px' }}>
              Share vCard (as file)
            </IonButton>

            <IonButton expand="block" onClick={shareContactWithText} color="secondary" style={{ marginTop: '10px' }}>
              Share vCard (as text)
            </IonButton>

            <IonButton
              expand="block"
              fill="outline"
              onClick={() => {
                const vcard = generateVCard(contact);
                console.log('Generated vCard:', vcard);
                alert('vCard copied to console. Check Xcode logs.');
              }}
              style={{ marginTop: '10px' }}
            >
              View vCard in Console
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default Home;
