'use client';

import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Fade,
  Heading,
  List,
  ListItem,
  Skeleton,
  SkeletonText,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import {
  meet,
  MeetSidePanelClient,
} from '@googleworkspace/meet-addons/meet.addons';
import { useEffect, useState } from 'react';
import { CLOUD_PROJECT_NUMBER, MAIN_STAGE_URL } from '../../constants';

type ApiResponse = {
  data: {
    bullet_points: string[];
    action_items: string[];
  };
};

type Supplement = {
  word: string;
  description: string;
  timestamp: number;
  isNew: boolean;
};

type SupplementResponse = {
  supplement: Array<{
    word: string;
    description: string;
  }>;
  result: boolean;
  message: string;
};

/**
 * See: https://developers.google.com/meet/add-ons/guides/overview#side-panel
 */
export default function Page() {
  const [sidePanelClient, setSidePanelClient] = useState<MeetSidePanelClient>();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [summary, setSummary] = useState<ApiResponse['data'] | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [meetingCode, setMeetingCode] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [supplements, setSupplements] = useState<Map<string, Supplement>>(new Map());
  const [isLoadingSupplements, setIsLoadingSupplements] = useState(false);

  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // 現在時刻を更新する関数
  const updateTime = () => {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString('ja-JP'));
  };

  // APIからデータを取得
  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://zenn-hackathon-2025-backend-666593730950.asia-northeast1.run.app/summarize_meeting');
      if (!response.ok) {
        throw new Error('APIの呼び出しに失敗しました');
      }
      const data: ApiResponse = await response.json();
      setSummary(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 補足情報を取得する関数
  const fetchSupplements = async () => {
    if (!meetingCode || !userName || !role) return;

    try {
      const response = await fetch('https://zenn-hackathon-2025-backend-666593730950.asia-northeast1.run.app/get_supplement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetId: meetingCode,
          userName: userName,
          role: role,
        }),
      });

      if (!response.ok) {
        throw new Error('補足情報の取得に失敗しました');
      }

      const data: SupplementResponse = await response.json();
      if (data.result && data.supplement.length > 0) {
        setSupplements(prevSupplements => {
          const newSupplements = new Map(prevSupplements);
          data.supplement.forEach(item => {
            if (!prevSupplements.has(item.word)) {
              newSupplements.set(item.word, {
                ...item,
                timestamp: Date.now(),
                isNew: true
              });
            }
          });
          return newSupplements;
        });

        // 3秒後にisNewフラグをリセット
        setTimeout(() => {
          setSupplements(prevSupplements => {
            const updatedSupplements = new Map(prevSupplements);
            updatedSupplements.forEach(supplement => {
              supplement.isNew = false;
            });
            return updatedSupplements;
          });
        }, 3000);
      }
    } catch (err) {
      console.error('補足情報の取得エラー:', err);
    }
  };

  // 1秒ごとに時刻を更新
  useEffect(() => {
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 初回マウント時にAPIからデータを取得
  useEffect(() => {
    fetchSummary();
  }, []);

  // 10秒ごとに補足情報を取得
  useEffect(() => {
    if (!meetingCode || !userName || !role) return;

    const timer = setInterval(fetchSupplements, 10000);
    return () => clearInterval(timer);
  }, [meetingCode, userName, role]);

  // Launches the main stage when the main button is clicked.
  async function startActivity(e: unknown) {
    if (!sidePanelClient) {
      throw new Error('Side Panel is not yet initialized!');
    }
    await sidePanelClient.startActivity({ mainStageUrl: MAIN_STAGE_URL });
  }

  /**
   * Prepares the Add-on Side Panel Client.
   */
  useEffect(() => {
    (async () => {
      const session = await meet.addon.createAddonSession({
        cloudProjectNumber: CLOUD_PROJECT_NUMBER,
      });
      const client = await session.createSidePanelClient();
      setSidePanelClient(client);

      // Get meeting info
      const meetingInfo = await client.getMeetingInfo();
      setMeetingCode(meetingInfo.meetingCode);
    })();
  }, []);

  return (
    <Container maxW="container.sm" py={4}>
      <VStack spacing={6} align="stretch">
        {/* 補足情報の表示 */}
        <Box p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
          <Heading size="md" mb={3}>補足情報</Heading>
          {supplements.size > 0 ? (
            <List spacing={2}>
              {Array.from(supplements.values())
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((supplement) => (
                  <Fade 
                    key={supplement.word} 
                    in={supplement.isNew} 
                    transition={{ enter: { duration: 0.5 } }}
                    style={{
                      transform: supplement.isNew ? 'translateY(0)' : 'none',
                      opacity: supplement.isNew ? 1 : 0.8
                    }}
                  >
                    <ListItem 
                      display="flex" 
                      alignItems="start" 
                      p={2} 
                      bg={supplement.isNew ? 'blue.50' : 'transparent'}
                      borderRadius="md"
                    >
                      <Text as="span" mr={2}>•</Text>
                      <Box>
                        <Text fontWeight="bold">{supplement.word}</Text>
                        <Text>{supplement.description}</Text>
                      </Box>
                    </ListItem>
                  </Fade>
                ))}
            </List>
          ) : (
            <Text color="gray.500" textAlign="center">補足情報はまだありません</Text>
          )}
        </Box>

        <Box>
          <Heading size="md" mb={2}>ユーザー情報</Heading>
          <VStack spacing={3}>
            <Box width="100%">
              <Text mb={2}>ユーザー名</Text>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid',
                  borderColor: borderColor,
                }}
              />
            </Box>
            <Box width="100%">
              <Text mb={2}>役割</Text>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid',
                  borderColor: borderColor,
                }}
              >
                <option value="">選択してください</option>
                <option value="engineer">エンジニア</option>
                <option value="designer">デザイナー</option>
                <option value="manager">プロダクトマネージャー</option>
              </select>
            </Box>
          </VStack>
        </Box>

        <Box>
          <Heading size="md" mb={2}>現在時刻</Heading>
          <Text fontSize="3xl" fontFamily="mono" color="blue.500">
            {currentTime}
          </Text>
        </Box>

        <Box>
          <Heading size="md" mb={2}>会議コード</Heading>
          <Badge fontSize="md" p={2} borderRadius="md">
            {meetingCode}
          </Badge>
        </Box>

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Box p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <VStack spacing={4} align="stretch">
              <Skeleton height="20px" width="200px" />
              <SkeletonText noOfLines={4} spacing={4} />
              <Text color="gray.500" textAlign="center">
                AIが前回のミーティングの要約を作成中です...
              </Text>
            </VStack>
          </Box>
        ) : summary && (
          <VStack spacing={4} align="stretch">
            <Box p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Heading size="md" mb={3}>会議の要点</Heading>
              <List spacing={2}>
                {summary.bullet_points.map((point, index) => (
                  <ListItem key={index} display="flex" alignItems="start">
                    <Text as="span" mr={2}>•</Text>
                    <Text>{point}</Text>
                  </ListItem>
                ))}
              </List>
            </Box>

            <Box p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Heading size="md" mb={3}>アクションアイテム</Heading>
              <List spacing={2}>
                {summary.action_items.map((item, index) => (
                  <ListItem key={index} display="flex" alignItems="start">
                    <Text as="span" mr={2}>•</Text>
                    <Text>{item}</Text>
                  </ListItem>
                ))}
              </List>
            </Box>
          </VStack>
        )}

        <Divider />

        <VStack spacing={4}>
          <Text color="gray.500" fontSize="sm">
            このサイドパネルはあなたにのみ表示されています。
          </Text>
          <Button
            colorScheme="blue"
            size="lg"
            width="full"
            onClick={startActivity}
            leftIcon={<span>📺</span>}
          >
            メインステージで表示
          </Button>
        </VStack>
      </VStack>
    </Container>
  );
}
