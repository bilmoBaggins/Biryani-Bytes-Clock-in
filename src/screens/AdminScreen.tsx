import { useState, useEffect } from "react";
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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getAllMonthlyPayroll, getCurrentMonthRange } from "../utils/payroll";
import { MonthlyPayroll } from "../types";
import { getTodayShifts } from "../database/shifts";
import { Shift, Employee } from "../types";
import {
  getEmployees,
  addEmployee,
  updateHourlyRate,
  deleteEmployee,
} from "../database/employees";
import React from "react";

export default function AdminScreen() {
  const [monthlyData, setMonthlyData] = useState<MonthlyPayroll[]>([]);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState("");

  // Add employee modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeRate, setNewEmployeeRate] = useState("12");

  // Edit employee modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editRate, setEditRate] = useState("");

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

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

  async function handleAddEmployee() {
    if (!newEmployeeName.trim()) {
      Alert.alert("Error", "Employee name is required");
      return;
    }

    try {
      const rate = parseFloat(newEmployeeRate) || 12;
      await addEmployee(newEmployeeName.trim(), rate);
      setNewEmployeeName("");
      setNewEmployeeRate("12");
      setShowAddModal(false);
      await loadData();
      Alert.alert("Success", `${newEmployeeName} added successfully`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add employee");
    }
  }

  async function handleEditEmployee() {
    if (!editingEmployee) return;

    try {
      const rate = parseFloat(editRate) || 12;
      await updateHourlyRate(editingEmployee.id, rate);
      setShowEditModal(false);
      setEditingEmployee(null);
      setEditRate("");
      await loadData();
      Alert.alert("Success", "Employee updated successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update employee");
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
    setShowEditModal(true);
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Admin Dashboard</Text>

        {/* Employee Management Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👥 Manage Employees</Text>
            <Pressable
              style={styles.addButton}
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
                  <Text style={styles.empRate}>£{emp.hourlyRate}/hr</Text>
                </View>
                <View style={styles.employeeActions}>
                  <Pressable
                    style={styles.editBtn}
                    onPress={() => openEditModal(emp)}
                  >
                    <Text style={styles.actionBtnText}>✏️</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteEmployee(emp)}
                  >
                    <Text style={styles.actionBtnText}>🗑️</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Today's Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Clock Ins/Outs</Text>
          {todayShifts.length === 0 ? (
            <Text style={styles.noData}>No shifts recorded today</Text>
          ) : (
            todayShifts.map((shift) => (
              <View key={shift.id} style={styles.shiftCard}>
                <View style={styles.shiftHeader}>
                  <Text style={styles.employeeName}>{shift.employeeName}</Text>
                  <Text style={styles.time}>{shift.clockInTime}</Text>
                </View>
                {shift.clockOutTime && (
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
                )}
                {!shift.clockOutTime && (
                  <Text style={styles.activeText}>🕐 Still clocked in</Text>
                )}
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
                    <Text style={styles.label}>Total Employees:</Text>
                    <Text style={styles.value}>{monthlyData.length}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.label}>Total Hours:</Text>
                    <Text style={styles.value}>
                      {monthlyData
                        .reduce((sum, r) => sum + r.totalHours, 0)
                        .toFixed(2)}
                      h
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.label}>Total Payroll:</Text>
                    <Text style={[styles.value, styles.totalPayAmount]}>
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

        <Pressable style={styles.refreshButton} onPress={loadData}>
          <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
        </Pressable>
      </ScrollView>

      {/* Add Employee Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Employee</Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter employee name"
              value={newEmployeeName}
              onChangeText={setNewEmployeeName}
            />

            <Text style={styles.inputLabel}>Hourly Rate (£)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="12.00"
              value={newEmployeeRate}
              onChangeText={setNewEmployeeRate}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={handleAddEmployee}
              >
                <Text style={[styles.modalBtnText, styles.confirmBtnText]}>
                  Add Employee
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit {editingEmployee?.name}
            </Text>

            <Text style={styles.inputLabel}>Hourly Rate (£)</Text>
            <TextInput
              style={styles.textInput}
              value={editRate}
              onChangeText={setEditRate}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={handleEditEmployee}
              >
                <Text style={[styles.modalBtnText, styles.confirmBtnText]}>
                  Update
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8F0",
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#7C2D12",
    marginBottom: 24,
    marginTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#C62828",
    marginBottom: 12,
  },
  noData: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    padding: 12,
  },
  shiftCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#7C2D12",
  },
  shiftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  time: {
    fontSize: 14,
    color: "#666",
  },
  shiftDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  detailText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  payText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
  },
  activeText: {
    fontSize: 13,
    color: "#F57C00",
    marginTop: 8,
    fontWeight: "500",
  },
  payrollCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#2E7D32",
  },
  payrollName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
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
    color: "#666",
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  payAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2E7D32",
  },
  summaryCard: {
    backgroundColor: "#7C2D12",
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  totalPayAmount: {
    color: "#FFD700",
    fontSize: 18,
  },
  refreshButton: {
    backgroundColor: "#C62828",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 24,
  },
  refreshButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  employeeCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#7C2D12",
  },
  employeeInfo: {
    flex: 1,
  },
  empName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  empRate: {
    fontSize: 13,
    color: "#666",
  },
  employeeActions: {
    flexDirection: "row",
    gap: 10,
  },
  editBtn: {
    backgroundColor: "#F57C00",
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtn: {
    backgroundColor: "#C62828",
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnText: {
    fontSize: 18,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#7C2D12",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#f0f0f0",
  },
  confirmBtn: {
    backgroundColor: "#2E7D32",
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  confirmBtnText: {
    color: "white",
  },
});
