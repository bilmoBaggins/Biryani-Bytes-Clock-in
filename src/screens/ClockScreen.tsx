import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { getEmployees } from "../database/employees";
import { clockInOut, getCurrentStatus } from "../database/shifts";
import { Employee } from "../types";

type Status = "clockedIn" | "clockedOut" | "notWorking";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function ClockScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [isError, setIsError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadEmployeesAndStatuses();
    }, [])
  );

  useEffect(() => {
    if (activeEmployee && pinInput.length === 4) {
      if (pinInput === activeEmployee.code) {
        submitClockInOut(activeEmployee);
      } else {
        triggerError();
      }
    }
  }, [pinInput]);

  async function loadEmployeesAndStatuses() {
    setLoadingList(true);
    try {
      const empList = await getEmployees();
      setEmployees(empList);

      const entries = await Promise.all(
        empList.map(async (emp) => {
          const status = await getCurrentStatus(emp.name);
          return [emp.name, status] as const;
        })
      );
      setStatuses(Object.fromEntries(entries));
    } catch (error) {
      console.error("Failed to load employees:", error);
    } finally {
      setLoadingList(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadEmployeesAndStatuses();
    setRefreshing(false);
  }

  function openPinModal(emp: Employee) {
    setActiveEmployee(emp);
    setPinInput("");
    setIsError(false);
    shakeAnim.setValue(0);
  }

  function closePinModal() {
    if (processing) return;
    setActiveEmployee(null);
    setPinInput("");
    setIsError(false);
  }

  function triggerError() {
    setIsError(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(() => {
      setIsError(false);
      setPinInput("");
    });
  }

  async function submitClockInOut(emp: Employee) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setProcessing(true);
    try {
      const result = await clockInOut(emp.name);
      setActiveEmployee(null);
      setPinInput("");
      Alert.alert("Success", result.message);
      await loadEmployeesAndStatuses();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to process clock in/out");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#C62828" />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Biryani Bytes</Text>
          <Text style={styles.subtitle}>Tap your name to clock in or out</Text>
        </View>

        {loadingList ? (
          <ActivityIndicator size="large" color="#C62828" />
        ) : employees.length === 0 ? (
          <Text style={styles.noData}>No employees have been added yet</Text>
        ) : (
          <View style={styles.grid}>
            {employees.map((emp) => {
              const status = statuses[emp.name] ?? "notWorking";
              const isClockedIn = status === "clockedIn";
              return (
                <Pressable
                  key={emp.id}
                  style={({ pressed }) => [
                    styles.tile,
                    isClockedIn ? styles.tileClockedIn : styles.tileClockedOut,
                    pressed && styles.tilePressed,
                  ]}
                  onPress={() => openPinModal(emp)}
                >
                  <View
                    style={[
                      styles.avatar,
                      isClockedIn ? styles.avatarClockedIn : styles.avatarClockedOut,
                    ]}
                  >
                    <Text style={styles.avatarText}>{initials(emp.name)}</Text>
                  </View>
                  <Text style={styles.tileName}>{emp.name}</Text>
                  <Text
                    style={[
                      styles.tileStatus,
                      isClockedIn ? styles.statusClockedIn : styles.statusClockedOut,
                    ]}
                  >
                    {isClockedIn ? "Clocked In" : "Clocked Out"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={activeEmployee !== null}
        transparent
        animationType="fade"
        onRequestClose={closePinModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closePinModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{activeEmployee?.name}</Text>
            <Text style={styles.modalSubtitle}>
              {processing ? "Processing..." : "Enter your 4-digit code"}
            </Text>

            <Animated.View style={{ transform: [{ translateX: shakeAnim }], width: "100%" }}>
              <TextInput
                style={[styles.pinInput, isError && styles.pinInputError]}
                value={pinInput}
                onChangeText={(text) => setPinInput(text.replace(/[^0-9]/g, "").slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
                placeholder="----"
                placeholderTextColor="#D9C9BC"
                editable={!processing}
              />
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const shadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FBF3EC",
  },
  container: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
    marginTop: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    color: "#7C2D12",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 6,
    color: "#8A7A70",
    fontWeight: "500",
  },
  noData: {
    fontSize: 14,
    color: "#B0A6A0",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  tile: {
    width: "47%",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    ...shadow,
  },
  tileClockedIn: {
    backgroundColor: "#E6F4E8",
    borderColor: "#A9DAB0",
  },
  tileClockedOut: {
    backgroundColor: "white",
    borderColor: "#F0E7DE",
  },
  tilePressed: {
    opacity: 0.8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarClockedIn: {
    backgroundColor: "#2E7D32",
  },
  avatarClockedOut: {
    backgroundColor: "#7C2D12",
  },
  avatarText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  tileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3A2A22",
    textAlign: "center",
  },
  tileStatus: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  statusClockedIn: {
    color: "#2E7D32",
  },
  statusClockedOut: {
    color: "#8A7A70",
  },

  // PIN modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30, 20, 15, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    ...shadow,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#7C2D12",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#8A7A70",
    marginTop: 6,
    marginBottom: 20,
  },
  pinInput: {
    backgroundColor: "#F7F1EC",
    borderWidth: 1.5,
    borderColor: "#EEE3DA",
    borderRadius: 12,
    paddingVertical: 14,
    width: "100%",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 12,
    color: "#3A2A22",
  },
  pinInputError: {
    borderColor: "#C62828",
    backgroundColor: "#FDECEA",
    color: "#C62828",
  },
});
