import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Alert,
  PermissionsAndroid,
  Platform,
  AppState,
  Share,
} from 'react-native';

import { pickFiles } from '@/lib/nativeFilePicker';
import LocalShareDashboard from '@/components/localshare/LocalShareDashboard';
import { openFile } from '@/lib/openFile';

import {
  addLocalShareFiles,
  getLocalReceivedFiles,
  scanLocalReceivedFiles,
  getLocalServerStatus,
  getLocalSharedFiles,
  getNetworkInfo,
  ReceivedFile,
  ServerInfo,
  ServerStatus,
  SharedFile,
  startLocalServer,
  stopLocalServer,
} from '@/lib/nativeDropLink';

export default function TabOneScreen() {

  // =========================================================
  // STATE
  // =========================================================

  const [serverInfo, setServerInfo] =
    useState<ServerInfo | null>(null);

  const [serverStatus, setServerStatus] =
    useState<ServerStatus | null>(null);

  const [sharedFiles, setSharedFiles] =
    useState<SharedFile[]>([]);

  const [receivedFiles, setReceivedFiles] =
    useState<ReceivedFile[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [isServerStarted, setIsServerStarted] =
    useState(false);


  // =========================================================
  // RECEIVED FILES SNAPSHOT
  // =========================================================
  //
  // When the server starts, we remember every file that already
  // exists.
  //
  // While the server is running, only files NOT in this Set
  // are displayed.
  //
  // When the server stops, the Set is cleared and all received
  // files are displayed again.
  //

  const receivedFilesAtServerStart =
    useRef<Set<string>>(new Set());

  // =========================================================
  // OPEN RECEIVED FILE
  // =========================================================
const handleReceivedFilePress = async (
  file: ReceivedFile,
) => {

  console.log('OPEN RECEIVED FILE:', file);

  try {

    await openFile(
      file.path,
      file.mimeType,
    );

  } catch (error) {

    console.error(
      'OPEN RECEIVED FILE ERROR:',
      error,
    );

    Alert.alert(
      'Cannot Open File',
      error instanceof Error
        ? error.message
        : String(error),
    );
  }
};

  // =========================================================
  // LOAD SERVER DATA
  // =========================================================
  //
  // serverRunningOverride is used when starting/stopping the
  // server because React state updates asynchronously.
  //

  const loadServerData = useCallback(
    async (
      serverRunningOverride?: boolean,
    ) => {

      const running =
        serverRunningOverride ??
        isServerStarted;

      // =======================================================
      // RECEIVED FILES
      // =======================================================

      try {

        const allReceived =
          await scanLocalReceivedFiles();

        if (running) {

          // ---------------------------------------------------
          // SERVER RUNNING
          // ---------------------------------------------------
          //
          // Show ONLY files received after this server session
          // started.
          //

          const currentSessionFiles =
            allReceived.filter(
              file =>
                !receivedFilesAtServerStart.current.has(
                  file.path,
                ),
            );

          setReceivedFiles(
            currentSessionFiles,
          );

          console.log(
            'CURRENT SERVER SESSION RECEIVED:',
            currentSessionFiles,
          );

        } else {

          // ---------------------------------------------------
          // SERVER STOPPED
          // ---------------------------------------------------
          //
          // Show ALL persisted received files.
          //

          setReceivedFiles(
            allReceived,
          );

          console.log(
            'ALL RECEIVED FILES:',
            allReceived,
          );
        }

      } catch (error) {

        console.error(
          'LOAD RECEIVED FILES ERROR:',
          error,
        );
      }

      // =======================================================
      // SERVER STATUS
      // =======================================================

      try {

        const status =
          await getLocalServerStatus();

        setServerStatus(status);

        setIsServerStarted(
          status.running,
        );

        if (
          status.running &&
          status.ip &&
          status.url
        ) {

          setServerInfo({
            ip: status.ip,
            port: status.port,
            url: status.url,
          });

        } else {

          setServerInfo(null);
        }

      } catch (error) {

        console.error(
          'LOAD SERVER STATUS ERROR:',
          error,
        );

        setIsServerStarted(false);

        setServerInfo(null);
      }

      // =======================================================
      // SHARED FILES
      // =======================================================

      try {

        const files =
          await getLocalSharedFiles();

        setSharedFiles(files);

      } catch (error) {

        console.error(
          'LOAD SHARED FILES ERROR:',
          error,
        );
      }
    },
    [isServerStarted],
  );

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {

    void loadServerData();

  }, [loadServerData]);

  // =========================================================
  // RELOAD WHEN APP BECOMES ACTIVE
  // =========================================================

  useEffect(() => {

    const subscription =
      AppState.addEventListener(
        'change',
        nextState => {

          if (nextState === 'active') {
            void loadServerData();
          }
        },
      );

    return () => {
      subscription.remove();
    };

  }, [loadServerData]);

  // =========================================================
  // AUTO REFRESH WHILE SERVER IS RUNNING
  // =========================================================

  useEffect(() => {

    if (!isServerStarted) {
      return;
    }

    const interval =
      setInterval(() => {

        void loadServerData();

      }, 2_000);

    return () => {
      clearInterval(interval);
    };

  }, [
    isServerStarted,
    loadServerData,
  ]);

  // =========================================================
  // REFRESH
  // =========================================================

  const handleRefresh = async () => {

    try {

      setRefreshing(true);

      await loadServerData();

    } finally {

      setRefreshing(false);
    }
  };

  const handleStartEmptyServer = async () => {
    if (loading || isServerStarted) {
      return;
    }

    try {
      setLoading(true);

      const network = await getNetworkInfo();

      if (!network.connected) {
        Alert.alert(
          'No Network',
          'Please connect to a Wi-Fi network before sharing.',
        );
        return;
      }

      const existingReceivedFiles =
        await scanLocalReceivedFiles();

      receivedFilesAtServerStart.current =
        new Set(existingReceivedFiles.map(file => file.path));

      const info = await startLocalServer([]);

      setServerInfo(info);
      setIsServerStarted(true);
      await loadServerData(true);

      Alert.alert(
        'DropLink Ready',
        `This device is ready to receive files.\n\n${info.url}`,
      );
    } catch (error) {
      Alert.alert(
        'Server Error',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setLoading(false);
    }
  };
  // =========================================================
  // SELECT / ADD FILES
  // =========================================================

  const handleSelectFiles = async () => {

    if (loading) {
      return;
    }

    try {

      setLoading(true);

      if (
        Platform.OS === 'android' &&
        Number(Platform.Version) >= 33
      ) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      }

      // -----------------------------------------------------
      // NETWORK
      // -----------------------------------------------------

      const network =
        await getNetworkInfo();

      if (!network.connected) {

        Alert.alert(
          'No Network',
          'Please connect to a Wi-Fi network before sharing.',
        );

        return;
      }

      // -----------------------------------------------------
      // PICK FILES
      // -----------------------------------------------------

      const files =
        await pickFiles();

      if (!files.length) {
        return;
      }

      // -----------------------------------------------------
      // START NEW SERVER
      // -----------------------------------------------------

      if (!isServerStarted) {

        // ---------------------------------------------------
        // SNAPSHOT EXISTING RECEIVED FILES
        // ---------------------------------------------------
        //
        // These files existed BEFORE this server session.
        // They will not be shown while the server is running.
        //

        try {

          const existingReceivedFiles =
            await scanLocalReceivedFiles();

          receivedFilesAtServerStart.current =
            new Set(
              existingReceivedFiles.map(
                file => file.path,
              ),
            );

          console.log(
            'RECEIVED FILES AT SERVER START:',
            existingReceivedFiles,
          );

        } catch (error) {

          console.error(
            'RECEIVED FILE SNAPSHOT ERROR:',
            error,
          );

          receivedFilesAtServerStart.current.clear();
        }

        // ---------------------------------------------------
        // START SERVER
        // ---------------------------------------------------

        const info =
          await startLocalServer(files);

        setServerInfo(info);

        setIsServerStarted(true);

        // Explicitly tell loadServerData that the server
        // is now running.
        await loadServerData(true);

        Alert.alert(
          'DropLink Ready',
          `Your device can now send and receive files.\n\n${info.url}`,
        );

        return;
      }

      // -----------------------------------------------------
      // SERVER ALREADY RUNNING
      // -----------------------------------------------------

      const existingUris =
        new Set(
          sharedFiles.map(
            file => file.uri,
          ),
        );

      const newFiles =
        files.filter(
          file =>
            !existingUris.has(
              file.uri,
            ),
        );

      if (!newFiles.length) {

        Alert.alert(
          'Already Added',
          'All selected files are already being shared.',
        );

        return;
      }

      // -----------------------------------------------------
      // ADD WITHOUT STOPPING SERVER
      // -----------------------------------------------------

      await addLocalShareFiles(
        newFiles,
      );

      // Refresh native list so downloadCount/index/etc.
      // always come from the native server.

      await loadServerData();

      Alert.alert(
        'Files Added',
        `${newFiles.length} ${
          newFiles.length === 1
            ? 'file has'
            : 'files have'
        } been added to the running server.`,
      );

    } catch (error) {

      console.error(
        'FILE SHARE ERROR:',
        error,
      );

      Alert.alert(
        'Share Error',
        error instanceof Error
          ? error.message
          : String(error),
      );

    } finally {

      setLoading(false);
    }
  };

  // =========================================================
  // STOP SERVER
  // =========================================================

  const handleStop = async () => {

    try {

      setLoading(true);

      await stopLocalServer();

      // -----------------------------------------------------
      // CLEAR CURRENT SERVER SESSION
      // -----------------------------------------------------

      receivedFilesAtServerStart.current.clear();

      setServerInfo(null);

      setServerStatus(null);

      setSharedFiles([]);

      setIsServerStarted(false);

      // -----------------------------------------------------
      // SERVER STOPPED
      // -----------------------------------------------------
      //
      // Show ALL persisted received files again.
      //

      await loadServerData(false);

    } catch (error) {

      console.error(
        'STOP SERVER ERROR:',
        error,
      );

      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : String(error),
      );

    } finally {

      setLoading(false);
    }
  };

  // =========================================================
  // SHARE URL
  // =========================================================

  const handleShareUrl = async () => {

    if (!serverInfo?.url) {
      return;
    }

    try {

      await Share.share({
        message:
          `Send and receive files with DropLink:\n` +
          serverInfo.url,
        url: serverInfo.url,
      });

    } catch (error) {

      console.error(
        'SHARE URL ERROR:',
        error,
      );

      Alert.alert(
        'Share Error',
        error instanceof Error
          ? error.message
          : String(error),
      );
    }
  };

  // =========================================================
  // TOTAL SHARED SIZE
  // =========================================================

  const totalSharedSize =
    sharedFiles.reduce(
      (total, file) =>
        total + (file.size || 0),
      0,
    );

  // =========================================================
  // TOTAL RECEIVED SIZE
  // =========================================================

  const totalReceivedSize =
    receivedFiles.reduce(
      (total, file) =>
        total + (file.size || 0),
      0,
    );

  // =========================================================
  // UI
  // =========================================================

  return (
    <LocalShareDashboard
      isServerStarted={isServerStarted}
      loading={loading}
      refreshing={refreshing}
      receivedFiles={receivedFiles}
      serverInfo={serverInfo}
      sharedFiles={sharedFiles}
      totalReceivedSize={totalReceivedSize}
      totalSharedSize={totalSharedSize}
      onOpenReceivedFile={handleReceivedFilePress}
      onRefresh={handleRefresh}
      onStartEmptyServer={handleStartEmptyServer}
      onSelectFiles={handleSelectFiles}
      onShareUrl={handleShareUrl}
      onStopServer={handleStop}
    />
  );
}

// =========================================================
// STYLES
// =========================================================
