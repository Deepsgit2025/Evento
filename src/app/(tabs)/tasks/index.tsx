import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, EmptyState, Button } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { TaskService } from '../../../services/task';
import { Task } from '../../../database/types';

function formatDue(task: Task): string | null {
  if (!task.reminder_time) return task.due_date;
  const date = new Date(task.reminder_time * 1000);
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function TasksScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [weddingId, setWeddingId] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setWeddingId(wedding.id);
      const rows = await TaskService.getTasks(db, wedding.id);
      setTasks(rows);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { fetchTasks(); }, [fetchTasks]));

  const handleToggle = async (task: Task) => {
    await TaskService.toggleStatus(db, task.id);
    fetchTasks();
  };

  const handleDelete = (task: Task) => {
    Alert.alert('Delete Task', `Remove "${task.title}" from your checklist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await TaskService.deleteTask(db, task.id);
          fetchTasks();
        }
      }
    ]);
  };

  const pending = tasks.filter(t => t.status !== 'DONE');
  const done = tasks.filter(t => t.status === 'DONE');

  if (isLoading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const renderTask = (task: Task) => {
    const dueLabel = formatDue(task);
    const isDone = task.status === 'DONE';
    return (
      <Pressable
        key={task.id}
        style={styles.taskRow}
        onPress={() => router.push(`/(tabs)/tasks/add?editId=${task.id}` as any)}
      >
        <Pressable style={styles.checkbox} onPress={() => handleToggle(task)} hitSlop={8}>
          <Ionicons
            name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
            size={26}
            color={isDone ? theme.colors.success : theme.colors.textMuted}
          />
        </Pressable>
        <View style={styles.taskBody}>
          <Typography
            variant="body"
            weight="medium"
            style={isDone ? styles.doneText : undefined}
            color={isDone ? theme.colors.textMuted : theme.colors.text}
          >
            {task.title}
          </Typography>
          {dueLabel && (
            <View style={styles.dueRow}>
              <Ionicons
                name={task.reminder_style === 'ALARM' ? 'alarm-outline' : 'notifications-outline'}
                size={13}
                color={theme.colors.textSecondary}
              />
              <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginLeft: 4 }}>
                {dueLabel}
              </Typography>
            </View>
          )}
        </View>
        <Pressable onPress={() => handleDelete(task)} hitSlop={8} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Typography variant="screenTitle">Checklist</Typography>
        <Button
          label=""
          leftIcon={<Ionicons name="add" size={20} color="#fff" />}
          onPress={() => router.push('/(tabs)/tasks/add' as any)}
          style={styles.addButton}
        />
      </View>

      {tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={<Ionicons name="checkbox-outline" size={48} color={theme.colors.border} />}
            title="No tasks yet"
            description="Add wedding to-dos and get reminded by alarm or message at the time you choose."
            actionLabel="+ Add Task"
            onAction={() => router.push('/(tabs)/tasks/add' as any)}
          />
        </View>
      ) : (
        <FlatList
          data={[{ key: 'pending' }, { key: 'done' }]}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            if (item.key === 'pending') {
              return (
                <View>
                  {pending.length > 0 && (
                    <Typography variant="caption" weight="semibold" color={theme.colors.textSecondary} style={styles.sectionLabel}>
                      TO DO ({pending.length})
                    </Typography>
                  )}
                  {pending.map(renderTask)}
                </View>
              );
            }
            if (done.length === 0) return null;
            return (
              <View>
                <Typography variant="caption" weight="semibold" color={theme.colors.textSecondary} style={styles.sectionLabel}>
                  DONE ({done.length})
                </Typography>
                {done.map(renderTask)}
              </View>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: theme.spacing.lg,
  },
  addButton: {
    width: 44, height: 44, paddingHorizontal: 0, borderRadius: 22,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  sectionLabel: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  checkbox: {
    marginRight: theme.spacing.md,
  },
  taskBody: {
    flex: 1,
  },
  doneText: {
    textDecorationLine: 'line-through',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
});
