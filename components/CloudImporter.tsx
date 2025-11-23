import React, { useEffect, useState, useRef } from 'react';
import { Cloud, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { DocCategory, GooglePickerDocument } from '../types';
import { dbService } from '../services/dbService';

interface CloudImporterProps {
  onImportComplete: () => void;
  category: DocCategory;
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const CloudImporter: React.FC<CloudImporterProps> = ({ onImportComplete, category }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [pickerInited, setPickerInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);
  const tokenClient = useRef<any>(null);
  const accessTokenRef = useRef<string | null>(null);

  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const APP_ID = process.env.GOOGLE_APP_ID;
  const API_KEY = process.env.API_KEY; // Using the same key for simplicity, ensure Drive API is enabled on this key
  const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

  useEffect(() => {
    const loadGoogleScripts = () => {
      const gapiLoaded = () => {
        window.gapi.load('client:picker', async () => {
          await window.gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
          setPickerInited(true);
        });
      };

      const gisLoaded = () => {
        tokenClient.current = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (response: any) => {
            if (response.access_token) {
              accessTokenRef.current = response.access_token;
              createPicker(response.access_token);
            }
          },
        });
        setGisInited(true);
      };

      if (window.gapi) gapiLoaded();
      if (window.google) gisLoaded();
    };

    loadGoogleScripts();
  }, []);

  const handleAuthClick = () => {
    if (!CLIENT_ID || !APP_ID) {
      alert("Mungon Client ID. Ju lutem kontrolloni konfigurimin.");
      return;
    }

    if (accessTokenRef.current) {
      createPicker(accessTokenRef.current);
    } else {
      tokenClient.current.requestAccessToken({ prompt: '' });
    }
  };

  const createPicker = (accessToken: string) => {
    if (!pickerInited || !gisInited) return;

    const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
    view.setMimeTypes('application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain');

    const picker = new window.google.picker.PickerBuilder()
      .setDeveloperKey(API_KEY!)
      .setAppId(APP_ID!)
      .setOAuthToken(accessToken)
      .addView(view)
      .addView(new window.google.picker.DocsUploadView())
      .setCallback(pickerCallback)
      .build();
    picker.setVisible(true);
  };

  const pickerCallback = async (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      setIsLoading(true);
      const documents: GooglePickerDocument[] = data.docs;
      
      try {
        let successCount = 0;
        for (const doc of documents) {
          await downloadFile(doc.id, doc.name, accessTokenRef.current!);
          successCount++;
        }
        alert(`U importuan me sukses ${successCount} dokumente në Bazën Ligjore.`);
        onImportComplete();
      } catch (error) {
        console.error(error);
        alert("Ndodhi një gabim gjatë importimit.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const downloadFile = async (fileId: string, fileName: string, token: string) => {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) throw new Error('Download failed');
    
    const blob = await response.blob();
    const file = new File([blob], fileName, { type: blob.type });
    await dbService.saveFile(file, category);
  };

  return (
    <button
      onClick={handleAuthClick}
      disabled={isLoading || !pickerInited || !gisInited}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors text-xs font-medium mb-2"
    >
      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
      <span>Importo Ligje nga Drive</span>
    </button>
  );
};

export default CloudImporter;