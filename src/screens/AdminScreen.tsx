import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Animated,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { getAllMonthlyPayroll, getCurrentMonthRange } from "../utils/payroll";
import { MonthlyPayroll } from "../types";
import { getTodayShifts } from "../database/shifts";
import { Shift, Employee } from "../types";
import {
  getEmployees,
  addEmployee,
  updateHourlyRate,
  updateEmployeeCode,
  deleteEmployee,
} from "../database/employees";
import { getAdminPin, setAdminPin } from "../database/settings";
import React from "react";

export default function AdminScreen() {
  const navigation = useNavigation();
  const [unlocked, setUnlocked] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [storedAdminPin, setStoredAdminPin] = useState("1234");
  const pinShakeAnim = useRef(new Animated.Value(0)).current;

  const [monthlyData, setMonthlyData] = useState<MonthlyPayroll[]>([]);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState("");

  // Add employee modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeRate, setNewEmployeeRate] = useState("12");

  // Edit employee modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editRate, setEditRate] = useState("");
  const [editCode, setEditCode] = useState("");

  // Change admin PIN modal
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [newAdminPin, setNewAdminPin] = useState("");
  const [confirmAdminPin, setConfirmAdminPin] = useState("");

  useEffect(() => {
    getAdminPin().then(setStoredAdminPin);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (unlocked) {
        loadData();
      }
    }, [unlocked])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      setUnlocked(false);
      setAdminPinInput("");
      setPinError(false);
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (adminPinInput.length === 4) {
      if (adminPinInput === storedAdminPin) {
        setAdminPinInput("");
        setUnlocked(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setPinError(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Animated.sequence([
          Animated.timing(pinShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(pinShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(pinShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(pinShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start(() => {
          setPinError(false);
          setAdminPinInput("");
        });
      }
    }
  }, [adminPinInput]);

  async function loadData() {
    setLoading(true);
    try {
      const { month } = getCurrentMonthRange();
      setCurrentMonth(month);

      const [monthly, today, empList] = await Promise.all([
        getAllMonthlyPayroll(month),
        getTodayShifts(),
        getEmployees(),
      ]);

      setMonthlyData(monthly);
      setTodayShifts(today);
      setEmployees(empList);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleAddEmployee() {
    if (!newEmployeeName.trim()) {
      Alert.alert("Error", "Employee name is required");
      return;
    }

    try {
      const rate = parseFloat(newEmployeeRate) || 12;
      const name = newEmployeeName.trim();
      const code = await addEmployee(name, rate);
      setNewEmployeeName("");
      setNewEmployeeRate("12");
      setShowAddModal(false);
      await loadData();
      Alert.alert("Success", `${name} added successfully.\nTheir clock-in code is ${code}.`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add employee");
    }
  }

  async function handleEditEmployee() {
    if (!editingEmployee) return;

    if (editCode.length !== 4) {
      Alert.alert("Error", "Code must be exactly 4 digits");
      return;
    }

    try {
      const rate = parseFloat(editRate) || 12;
      await updateHourlyRate(editingEmployee.id, rate);
      if (editCode !== editingEmployee.code) {
        await updateEmployeeCode(editingEmployee.id, editCode);
      }
      setShowEditModal(false);
      setEditingEmployee(null);
      setEditRate("");
      setEditCode("");
      await loadData();
      Alert.alert("Success", "Employee updated successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update employee");
    }
  }

  async function handleChangeAdminPin() {
    if (newAdminPin.length !== 4) {
      Alert.alert("Error", "PIN must be exactly 4 digits");
      return;
    }
    if (newAdminPin !== confirmAdminPin) {
      Alert.alert("Error", "PINs do not match");
      return;
    }

    try {
      await setAdminPin(newAdminPin);
      setStoredAdminPin(newAdminPin);
      setShowChangePinModal(false);
      setNewAdminPin("");
      setConfirmAdminPin("");
      Alert.alert("Success", "Admin PIN updated successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update admin PIN");
    }
  }

  async function handleDeleteEmployee(emp: Employee) {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to remove ${emp.name}? This will not delete their shift history.`,
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await deleteEmployee(emp.id);
              await loadData();
              Alert.alert("Deleted", `${emp.name} has been removed`);
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete employee");
            }
          },
          style: "destructive",
        },
      ]
    );
  }

  function openEditModal(emp: Employee) {
    setEditingEmployee(emp);
    setEditRate(emp.hourlyRate.toString());
    setEditCode(emp.code);
    setShowEditModal(true);
  }

  function closeAddModal() {
    setShowAddModal(false);
    setNewEmployeeName("");
    setNewEmployeeRate("12");
  }

  if (!unlocked) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.lockContainer}>
          <Text style={styles.lockTitle}>Admin Access</Text>
          <Text style={styles.lockSubtitle}>Enter the admin code to continue</Text>

          <Animated.View style={{ transform: [{ translateX: pinShakeAnim }], width: "100%", maxWidth: 260 }}>
            <TextInput
              style={[styles.lockInput, pinError && styles.lockInputError]}
              value={adminPinInput}
              onChangeText={(text) => setAdminPinInput(text.replace(/[^0-9]/g, "").slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
              placeholder="----"
              placeholderTextColor="#D9C9BC"
            />
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#C62828" />
        }
      >
        <Text style={styles.title}>Admin Dashboard</Text>

        {/* Employee Management Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Manage Employees</Text>
            <Pressable
              style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#C62828" />
          ) : employees.length === 0 ? (
            <Text style={styles.noData}>No employees</Text>
          ) : (
            employees.map((emp) => (
              <View key={emp.id} style={styles.employeeCard}>
                <View style={styles.employeeInfo}>
                  <Text style={styles.empName}>{emp.name}</Text>
                  <Text style={styles.empRate}>£{emp.hourlyRate}/hr · Code: {emp.code}</Text>
                </View>
                <View style={styles.employeeActions}>
                  <Pressable
                    style={({ pressed }) => [styles.editBtn, pressed && styles.btnPressed]}
                    onPress={() => openEditModal(emp)}
                  >
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.deleteBtn, pressed && styles.btnPressed]}
                    onPress={() => handleDeleteEmployee(emp)}
                  >
                    <Text style={styles.actionBtnText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Today's Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Clock Ins/Outs</Text>
          {todayShifts.filter((shift) => shift.clockOutTime).length === 0 ? (
            <Text style={styles.noData}>No completed shifts yet today</Text>
          ) : (
            todayShifts
              .filter((shift) => shift.clockOutTime)
              .map((shift) => (
                <View key={shift.id} style={styles.shiftCard}>
                  <View style={styles.shiftHeader}>
                    <Text style={styles.employeeName}>{shift.employeeName}</Text>
                    <Text style={styles.time}>Clock In: {shift.clockInTime}</Text>
                  </View>
                  <View style={styles.shiftDetails}>
                    <Text style={styles.detailText}>
                      Clock Out: {shift.clockOutTime}
                    </Text>
                    {shift.hourlyPay && (
                      <Text style={styles.payText}>
                        Pay: £{shift.hourlyPay.toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
              ))
          )}
        </View>

        {/* Monthly Payroll */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Monthly Payroll ({currentMonth})
          </Text>
          {loading ? (
            <ActivityIndicator size="large" color="#C62828" />
          ) : monthlyData.length === 0 ? (
            <Text style={styles.noData}>No payroll data available</Text>
          ) : (
            <>
              {monthlyData.map((record, idx) => (
                <View key={idx} style={styles.payrollCard}>
                  <Text style={styles.payrollName}>{record.employeeName}</Text>
                  <View style={styles.payrollDetails}>
                    <View style={styles.payrollRow}>
                      <Text style={styles.label}>Hours:</Text>
                      <Text style={styles.value}>
                        {record.totalHours.toFixed(2)}h
                      </Text>
                    </View>
                    <View style={styles.payrollRow}>
                      <Text style={styles.label}>Total Pay:</Text>
                      <Text style={styles.payAmount}>
                        £{record.totalPay.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {/* Summary */}
              {monthlyData.length > 0 && (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Monthly Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Employees:</Text>
                    <Text style={styles.summaryValue}>{monthlyData.length}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Hours:</Text>
                    <Text style={styles.summaryValue}>
                      {monthlyData
                        .reduce((sum, r) => sum + r.totalHours, 0)
                        .toFixed(2)}
                      h
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, styles.summaryRowLast]}>
                    <Text style={styles.summaryLabel}>Total Payroll:</Text>
                    <Text style={styles.totalPayAmount}>
                      £
                      {monthlyData
                        .reduce((sum, r) => sum + r.totalPay, 0)
                        .toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <Pressable
            style={({ pressed }) => [styles.outlineButton, pressed && styles.outlineButtonPressed]}
            onPress={() => setShowChangePinModal(true)}
          >
            <Text style={styles.outlineButtonText}>Change Admin PIN</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Add Employee Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={closeAddModal}
      >
        <Pressable style={styles.modalContainer} onPress={closeAddModal}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add New Employee</Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter employee name"
              placeholderTextColor="#B0A6A0"
              value={newEmployeeName}
              onChangeText={setNewEmployeeName}
            />

            <Text style={styles.inputLabel}>Hourly Rate (£)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="12.00"
              placeholderTextColor="#B0A6A0"
              value={newEmployeeRate}
              onChangeText={setNewEmployeeRate}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.cancelBtn, pressed && styles.btnPressed]}
                onPress={closeAddModal}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.confirmBtn, pressed && styles.confirmBtnPressed]}
                onPress={handleAddEmployee}
              >
                <Text style={[styles.modalBtnText, styles.confirmBtnText]}>
                  Add Employee
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable style={styles.modalContainer} onPress={() => setShowEditModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editingEmployee ? `Edit ${editingEmployee.name}` : "Edit Employee"}
            </Text>

            <Text style={styles.inputLabel}>Hourly Rate (£)</Text>
            <TextInput
              style={styles.textInput}
              value={editRate}
              onChangeText={setEditRate}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>4-Digit Code</Text>
            <TextInput
              style={styles.textInput}
              value={editCode}
              onChangeText={(text) => setEditCode(text.replace(/[^0-9]/g, "").slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.cancelBtn, pressed && styles.btnPressed]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.confirmBtn, pressed && styles.confirmBtnPressed]}
                onPress={handleEditEmployee}
              >
                <Text style={[styles.modalBtnText, styles.confirmBtnText]}>
                  Update
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Change Admin PIN Modal */}
      <Modal
        visible={showChangePinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangePinModal(false)}
      >
        <Pressable
          style={styles.modalContainer}
          onPress={() => {
            setShowChangePinModal(false);
            setNewAdminPin("");
            setConfirmAdminPin("");
          }}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Change Admin PIN</Text>

            <Text style={styles.inputLabel}>New PIN</Text>
            <TextInput
              style={styles.textInput}
              value={newAdminPin}
              onChangeText={(text) => setNewAdminPin(text.replace(/[^0-9]/g, "").slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="----"
              placeholderTextColor="#B0A6A0"
            />

            <Text style={styles.inputLabel}>Confirm New PIN</Text>
            <TextInput
              style={styles.textInput}
              value={confirmAdminPin}
              onChangeText={(text) => setConfirmAdminPin(text.replace(/[^0-9]/g, "").slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="----"
              placeholderTextColor="#B0A6A0"
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.cancelBtn, pressed && styles.btnPressed]}
                onPress={() => {
                  setShowChangePinModal(false);
                  setNewAdminPin("");
                  setConfirmAdminPin("");
                }}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.confirmBtn, pressed && styles.confirmBtnPressed]}
                onPress={handleChangeAdminPin}
              >
                <Text style={[styles.modalBtnText, styles.confirmBtnText]}>
                  Save
                </Text>
              </Pressable>
            </View>
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
    flex: 1,
    backgroundColor: "#FBF3EC",
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#7C2D12",
    marginBottom: 20,
    marginTop: 16,
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#7C2D12",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  noData: {
    fontSize: 14,
    color: "#B0A6A0",
    fontStyle: "italic",
    padding: 12,
  },
  shiftCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#7C2D12",
    ...shadow,
  },
  shiftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3A2A22",
  },
  time: {
    fontSize: 13,
    color: "#8A7A70",
    fontWeight: "500",
  },
  shiftDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0E7DE",
  },
  detailText: {
    fontSize: 13,
    color: "#8A7A70",
    marginBottom: 4,
  },
  payText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2E7D32",
  },
  activeText: {
    fontSize: 13,
    color: "#2E7D32",
    marginTop: 8,
    fontWeight: "600",
  },
  payrollCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#2E7D32",
    ...shadow,
  },
  payrollName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3A2A22",
    marginBottom: 10,
  },
  payrollDetails: {
    gap: 8,
  },
  payrollRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 13,
    color: "#8A7A70",
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3A2A22",
  },
  payAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2E7D32",
  },
  summaryCard: {
    backgroundColor: "#7C2D12",
    borderRadius: 16,
    padding: 18,
    marginTop: 6,
    ...shadow,
    shadowColor: "#7C2D12",
    shadowOpacity: 0.25,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
    marginBottom: 14,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  summaryRowLast: {
    borderBottomWidth: 0,
    paddingTop: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
  },
  totalPayAmount: {
    color: "#FFD54F",
    fontSize: 20,
    fontWeight: "800",
  },
  outlineButton: {
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#7C2D12",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  outlineButtonPressed: {
    backgroundColor: "#F7F1EC",
  },
  outlineButtonText: {
    color: "#7C2D12",
    fontSize: 15,
    fontWeight: "700",
  },

  // Employee Management Styles
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonPressed: {
    backgroundColor: "#276A2A",
  },
  addButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },
  employeeCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#7C2D12",
    ...shadow,
  },
  employeeInfo: {
    flex: 1,
  },
  empName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3A2A22",
    marginBottom: 4,
  },
  empRate: {
    fontSize: 13,
    color: "#8A7A70",
    fontWeight: "500",
  },
  employeeActions: {
    flexDirection: "row",
    gap: 10,
  },
  editBtn: {
    backgroundColor: "#F57C00",
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtn: {
    backgroundColor: "#C62828",
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  btnPressed: {
    opacity: 0.75,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "white",
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(30, 20, 15, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5D9CD",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#7C2D12",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8A7A70",
    marginBottom: 8,
    marginTop: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  textInput: {
    backgroundColor: "#F7F1EC",
    borderWidth: 1,
    borderColor: "#EEE3DA",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#3A2A22",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#F0E7DE",
  },
  confirmBtn: {
    backgroundColor: "#2E7D32",
  },
  confirmBtnPressed: {
    backgroundColor: "#276A2A",
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3A2A22",
  },
  confirmBtnText: {
    color: "white",
  },

  // Admin lock screen
  lockContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  lockTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#7C2D12",
  },
  lockSubtitle: {
    fontSize: 14,
    color: "#8A7A70",
    marginTop: 6,
    marginBottom: 24,
    textAlign: "center",
  },
  lockInput: {
    backgroundColor: "white",
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
  lockInputError: {
    borderColor: "#C62828",
    backgroundColor: "#FDECEA",
    color: "#C62828",
  },
});
