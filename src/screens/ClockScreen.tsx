import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getEmployees } from "../database/employees";
import { clockInOut, getCurrentStatus } from "../database/shifts";
import { Employee } from "../types";

export default function ClockScreen() {
  const [nameInput, setNameInput] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"clockedIn" | "clockedOut" | "notWorking">("notWorking");

  useEffect(() => {
    loadEmployees();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (selectedName) {
        updateStatus(selectedName);
      }
    }, [selectedName])
  );

  async function loadEmployees() {
    try {
      const empList = await getEmployees();
      setEmployees(empList);
    } catch (error) {
      console.error("Failed to load employees:", error);
    }
  }

  async function updateStatus(name: string) {
    try {
      const currentStatus = await getCurrentStatus(name);
      setStatus(currentStatus);
    } catch (error) {
      console.error("Failed to get status:", error);
    }
  }

  const suggestions =
    nameInput.length === 0
      ? []
      : employees.filter((emp) =>
          emp.name.toLowerCase().startsWith(nameInput.toLowerCase())
        );

  function selectEmployee(emp: Employee) {
    setSelectedName(emp.name);
    setNameInput(emp.name);
    updateStatus(emp.name);
  }

  async function handleClockInOut() {
    if (!selectedName) {
      Alert.alert("Invalid name", "Please select a name from the list.");
      return;
    }

    setLoading(true);
    try {
      const result = await clockInOut(selectedName);
      Alert.alert("Success", result.message);
      await updateStatus(selectedName);
      setNameInput("");
      setSelectedName("");
      setStatus("notWorking");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to process clock in/out");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Biryani Bytes</Text>
      <Text style={styles.subtitle}>Staff Clock In / Out</Text>

      <TextInput
        value={nameInput}
        onChangeText={(text) => {
          setNameInput(text);
          setSelectedName("");
          setStatus("notWorking");
        }}
        placeholder="Start typing your name..."
        style={styles.input}
        editable={!loading}
      />

      {suggestions.map((emp) => (
        <Pressable
          key={emp.id}
          style={styles.suggestion}
          onPress={() => selectEmployee(emp)}
          disabled={loading}
        >
          <Text style={styles.suggestionText}>{emp.name}</Text>
        </Pressable>
      ))}

      {selectedName && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Current Status:</Text>
          <Text style={[
            styles.statusText,
            status === "clockedIn" ? styles.statusClocked : styles.statusNotClocked
          ]}>
            {status === "clockedIn" ? "🕐 Clocked In" : "Clocked Out"}
          </Text>
        </View>
      )}

      <Pressable
        style={[styles.clockButton, loading && styles.clockButtonDisabled]}
        onPress={handleClockInOut}
        disabled={loading}
      >
        <Text style={styles.clockButtonText}>
          {loading ? "Processing..." : "Clock In / Out"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#FFF8F0",
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#7C2D12",
  },
  subtitle: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 35,
    color: "#444",
  },
  input: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    fontSize: 18,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
  },
  suggestion: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  suggestionText: {
    fontSize: 18,
  },
  statusContainer: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#7C2D12",
  },
  statusLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  statusClocked: {
    color: "#2E7D32",
  },
  statusNotClocked: {
    color: "#F57C00",
  },
  clockButton: {
    backgroundColor: "#C62828",
    padding: 18,
    borderRadius: 12,
    marginTop: 20,
  },
  clockButtonDisabled: {
    opacity: 0.6,
  },
  clockButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
});