import React, { useState, useEffect } from "react";
import { Command } from "../../types";
import {
  userPreferencesService,
  CommandAlias,
} from "../../services/preferences";
import { commandRegistry } from "../../services/commandRegistry";
import { useErrorHandler } from "../../hooks";

interface CommandAliasManagerProps {
  onClose: () => void;
}

/**
 * Component for managing command aliases
 */
export const CommandAliasManager: React.FC<CommandAliasManagerProps> = ({
  onClose,
}) => {
  const [aliases, setAliases] = useState<CommandAlias[]>([]);
  const [availableCommands, setAvailableCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const { handleError } = useErrorHandler();

  // Form state for adding a new alias
  const [newAlias, setNewAlias] = useState<{
    name: string;
    commandId: string;
    params: string;
    description: string;
  }>({
    name: "",
    commandId: "",
    params: "",
    description: "",
  });

  // Input validation
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    commandId?: string;
  }>({});

  // Load aliases and available commands
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load saved aliases
        const savedAliases = await userPreferencesService.getCommandAliases();
        setAliases(savedAliases);

        // Load available commands
        const commands = commandRegistry.getAvailableCommands();
        setAvailableCommands(commands);
      } catch (error) {
        handleError(error, "Failed to load aliases and commands");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [handleError]);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setNewAlias((prev) => ({ ...prev, [name]: value }));

    // Clear validation error on change
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const errors: { name?: string; commandId?: string } = {};

    if (!newAlias.name.trim()) {
      errors.name = "Alias name is required";
    } else if (newAlias.name.includes(" ")) {
      errors.name = "Alias name cannot contain spaces";
    } else if (
      aliases.some((a) => a.name.toLowerCase() === newAlias.name.toLowerCase())
    ) {
      errors.name = "An alias with this name already exists";
    }

    if (!newAlias.commandId) {
      errors.commandId = "Command is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const newAliasObject: CommandAlias = {
        id: `alias-${Date.now()}`, // Generate unique ID
        name: newAlias.name,
        commandId: newAlias.commandId,
        params: newAlias.params || undefined,
        description: newAlias.description || undefined,
      };

      await userPreferencesService.setCommandAlias(newAliasObject);

      // Update local state
      setAliases((prev) => [...prev, newAliasObject]);

      // Reset form
      setNewAlias({
        name: "",
        commandId: "",
        params: "",
        description: "",
      });

      // Hide form
      setIsAdding(false);
    } catch (error) {
      handleError(error, "Failed to create alias");
    }
  };

  // Delete an alias
  const handleDelete = async (aliasId: string) => {
    try {
      await userPreferencesService.deleteCommandAlias(aliasId);

      // Update local state
      setAliases((prev) => prev.filter((a) => a.id !== aliasId));
    } catch (error) {
      handleError(error, "Failed to delete alias");
    }
  };

  // Find command name by ID
  const getCommandNameById = (commandId: string): string => {
    const command = availableCommands.find((c) => c.id === commandId);
    return command ? command.name : commandId;
  };

  if (loading) {
    return (
      <div className="cmd-k-alias-manager">
        <div className="cmd-k-alias-manager-header">
          <h2>Command Aliases</h2>
          <button className="cmd-k-close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="cmd-k-alias-manager-content">
          <div style={{ padding: "20px", textAlign: "center" }}>
            Loading aliases...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cmd-k-alias-manager">
      <div className="cmd-k-alias-manager-header">
        <h2>Command Aliases</h2>
        <button className="cmd-k-close-button" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="cmd-k-alias-manager-content">
        {/* List of existing aliases */}
        {aliases.length > 0 ? (
          <div className="cmd-k-alias-list">
            <table className="cmd-k-alias-table">
              <thead>
                <tr>
                  <th>Alias</th>
                  <th>Command</th>
                  <th>Parameters</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {aliases.map((alias) => (
                  <tr key={alias.id}>
                    <td className="cmd-k-alias-name">/{alias.name}</td>
                    <td>{getCommandNameById(alias.commandId)}</td>
                    <td>{alias.params || "-"}</td>
                    <td>{alias.description || "-"}</td>
                    <td>
                      <button
                        className="cmd-k-alias-delete"
                        onClick={() => handleDelete(alias.id)}
                        aria-label="Delete alias"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cmd-k-empty-aliases">
            <p>You haven't created any command aliases yet.</p>
            <p>
              Aliases let you create shortcuts for commands you use frequently.
            </p>
          </div>
        )}

        {/* Form for adding a new alias */}
        {isAdding ? (
          <form className="cmd-k-alias-form" onSubmit={handleSubmit}>
            <h3>Create New Alias</h3>

            <div className="cmd-k-form-group">
              <label htmlFor="alias-name">Alias Name (without /)</label>
              <input
                id="alias-name"
                name="name"
                type="text"
                value={newAlias.name}
                onChange={handleInputChange}
                placeholder="e.g. build"
                className={formErrors.name ? "cmd-k-input-error" : ""}
              />
              {formErrors.name && (
                <div className="cmd-k-form-error">{formErrors.name}</div>
              )}
              <div className="cmd-k-form-help">
                This is what you'll type after the / character
              </div>
            </div>

            <div className="cmd-k-form-group">
              <label htmlFor="alias-command">Command</label>
              <select
                id="alias-command"
                name="commandId"
                value={newAlias.commandId}
                onChange={handleInputChange}
                className={formErrors.commandId ? "cmd-k-input-error" : ""}
              >
                <option value="">Select a command</option>
                {availableCommands.map((command) => (
                  <option key={command.id} value={command.id}>
                    {command.name} (/{command.id})
                  </option>
                ))}
              </select>
              {formErrors.commandId && (
                <div className="cmd-k-form-error">{formErrors.commandId}</div>
              )}
            </div>

            <div className="cmd-k-form-group">
              <label htmlFor="alias-params">
                Default Parameters (optional)
              </label>
              <input
                id="alias-params"
                name="params"
                type="text"
                value={newAlias.params}
                onChange={handleInputChange}
                placeholder="e.g. frontend"
              />
              <div className="cmd-k-form-help">
                Parameters automatically passed to the command
              </div>
            </div>

            <div className="cmd-k-form-group">
              <label htmlFor="alias-description">
                Custom Description (optional)
              </label>
              <textarea
                id="alias-description"
                name="description"
                value={newAlias.description}
                onChange={handleInputChange}
                placeholder="e.g. Create a new build for the frontend pipeline"
                rows={2}
              />
            </div>

            <div className="cmd-k-form-actions">
              <button
                type="button"
                className="cmd-k-btn-secondary"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </button>
              <button type="submit" className="cmd-k-btn-primary">
                Create Alias
              </button>
            </div>
          </form>
        ) : (
          <div className="cmd-k-alias-actions">
            <button
              className="cmd-k-btn-primary"
              onClick={() => setIsAdding(true)}
            >
              Create New Alias
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
