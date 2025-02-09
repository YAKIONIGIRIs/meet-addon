'use client';

import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Flex,
  Heading,
  Icon,
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
  MeetMainStageClient,
} from '@googleworkspace/meet-addons/meet.addons';
import { useEffect, useState } from 'react';
import { CLOUD_PROJECT_NUMBER } from '../../constants';

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
 * See: https://developers.google.com/meet/add-ons/guides/overview#main-stage
 */
export default function Page() {
  const [mainStageClient, setMainStageClient] = useState<MeetMainStageClient>();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [summary, setSummary] = useState<ApiResponse['data'] | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [supplements, setSupplements] = useState<Map<string, Supplement>>(new Map());
  const [isLoadingSupplements, setIsLoadingSupplements] = useState(false);

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
    try {
      const response = await fetch('https://zenn-hackathon-2025-backend-666593730950.asia-northeast1.run.app/get_supplement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetId: 'shared-view', // メインステージは共有ビューなので固定値
          userName: 'shared-view',
          role: 'all',
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

        // 5秒後に背景色のみを元に戻す
        setTimeout(() => {
          setSupplements(prevSupplements => {
            const updatedSupplements = new Map(prevSupplements);
            updatedSupplements.forEach(supplement => {
              if (supplement.isNew) {
                supplement.isNew = false;
              }
            });
            return updatedSupplements;
          });
        }, 5000);
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
    const timer = setInterval(fetchSupplements, 10000);
    return () => clearInterval(timer);
  }, []);

  /**
   * Prepares the Add-on Main Stage Client, which signals that the add-on has
   * successfully launched in the main stage.
   */
  useEffect(() => {
    (async () => {
      const session = await meet.addon.createAddonSession({
        cloudProjectNumber: CLOUD_PROJECT_NUMBER,
      });
      setMainStageClient(await session.createMainStageClient());
    })();
  }, []);

  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={8} align="center">
        <Box textAlign="center">
          <Heading as="h1" size="xl" mb={4}>
            Meet アドオン - 会議サマリー
          </Heading>
          <Text fontSize="6xl" fontFamily="mono" color="blue.500" fontWeight="bold">
            {currentTime}
          </Text>
        </Box>

        {/* 補足情報の表示 */}
        <Box p={6} bg={bgColor} borderRadius="xl" borderWidth="1px" borderColor={borderColor} width="full">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="lg" display="flex" alignItems="center">
              <Icon as={() => <span>💡</span>} mr={2} />
              補足情報
            </Heading>
            {supplements.size > 0 && (
              <Button
                size="md"
                colorScheme="gray"
                variant="ghost"
                onClick={() => setSupplements(new Map())}
                leftIcon={<span>🗑️</span>}
              >
                クリア
              </Button>
            )}
          </Box>
          {supplements.size > 0 ? (
            <List spacing={3}>
              {Array.from(supplements.values())
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((supplement) => (
                  <ListItem
                    key={supplement.word}
                    display="flex"
                    alignItems="start"
                    p={3}
                    transition="all 0.3s ease-in-out"
                    bg={supplement.isNew ? 'blue.50' : 'transparent'}
                    borderRadius="md"
                  >
                    <Text as="span" mr={3} color="blue.500">•</Text>
                    <Box flex="1">
                      <Box display="flex" alignItems="center" gap={2}>
                        <Text fontWeight="bold">{supplement.word}</Text>
                        {supplement.isNew && (
                          <Badge colorScheme="blue" fontSize="xs">
                            New
                          </Badge>
                        )}
                      </Box>
                      <Text>{supplement.description}</Text>
                    </Box>
                  </ListItem>
                ))}
            </List>
          ) : (
            <Text color="gray.500" textAlign="center">補足情報はまだありません</Text>
          )}
        </Box>

        {error && (
          <Alert status="error" borderRadius="lg" width="full">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Box p={6} bg={bgColor} borderRadius="xl" borderWidth="1px" borderColor={borderColor} width="full">
            <VStack spacing={6} align="stretch">
              <Skeleton height="40px" />
              <SkeletonText noOfLines={6} spacing={4} />
              <Text color="gray.500" textAlign="center" fontSize="lg">
                AIが前回のミーティングの要約を作成中です...
              </Text>
            </VStack>
          </Box>
        ) : summary && (
          <Flex direction="column" gap={6} width="full">
            <Box p={6} bg={bgColor} borderRadius="xl" borderWidth="1px" borderColor={borderColor}>
              <Heading size="lg" mb={4} display="flex" alignItems="center">
                <Icon as={() => <span>💡</span>} mr={2} />
                前回会議の要点
              </Heading>
              <List spacing={3}>
                {summary.bullet_points.map((point, index) => (
                  <ListItem key={index} display="flex" alignItems="start">
                    <Text as="span" mr={3} color="blue.500">•</Text>
                    <Text>{point}</Text>
                  </ListItem>
                ))}
              </List>
            </Box>

            <Box p={6} bg={bgColor} borderRadius="xl" borderWidth="1px" borderColor={borderColor}>
              <Heading size="lg" mb={4} display="flex" alignItems="center">
                <Icon as={() => <span>✅</span>} mr={2} />
                アクションアイテム
              </Heading>
              <List spacing={3}>
                {summary.action_items.map((item, index) => (
                  <ListItem key={index} display="flex" alignItems="start">
                    <Text as="span" mr={3} color="green.500">•</Text>
                    <Text>{item}</Text>
                  </ListItem>
                ))}
              </List>
            </Box>
          </Flex>
        )}

        <Divider />
        
        <Text color="gray.500" fontSize="md">
          このページは全ての参加者に表示されています
        </Text>
      </VStack>
    </Container>
  );
}
